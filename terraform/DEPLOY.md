# HireMe — deploy to a new AWS account

This is the full runbook. It reproduces the lab architecture (Amplify, Cognito,
API Gateway, Lambdas, DynamoDB, ECS agent) in a **normal AWS account**.

Do **not** run this while signed in to the AWS Academy lab
(`590183800076`). That would create a second app next to the working lab.

You need:

- AWS CLI credentials for the **target** account (not the lab)
- Docker (for the agent image)
- Terraform `>= 1.6`
- Python 3.12 (Lambda packaging)
- The same LiveKit / Simli / Deepgram / Cartesia / OpenAI keys the lab uses
  (or new ones)
- Optional: a GitHub PAT with `repo` scope for
  `MayaandMayOrganization/HireMe`

All commands assume:

```bash
cd /Users/benhen/Documents/projects/hireme/HireMe/terraform
export AWS_PAGER=""
export AWS_DEFAULT_REGION="us-east-1"
```

---

## 0. Confirm the account

```bash
aws sts get-caller-identity
```

The `Account` field must **not** be `590183800076`.

Collect from the lab (while lab credentials still work) and keep them
offline — they go into `terraform.tfvars` or Secrets Manager, never Git:

| Value | Where it lives in the lab |
| --- | --- |
| HR Simli face UUID | ECS task env `SIMLI_FACE_ID` or `HR_SIMLI_FACE_ID` |
| Technical Simli face UUID | `dd10cb5a-d31d-4f12-b69f-6db3383c006e` |
| LiveKit URL, API key, secret | Token Lambda env + agent secret |
| `SIMLI_API_KEY`, `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY`, `OPENAI_API_KEY` | ECS Secrets Manager / task env |

Copy the HR face from the lab:

```bash
CLUSTER="$(aws ecs list-clusters --query 'clusterArns[0]' --output text)"
SERVICE="$(aws ecs list-services --cluster "$CLUSTER" --query 'serviceArns[0]' --output text)"
TASK_DEF="$(aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" --query 'services[0].taskDefinition' --output text)"
aws ecs describe-task-definition --task-definition "$TASK_DEF" \
  --query 'taskDefinition.containerDefinitions[0].environment[?contains(name, `SIMLI`) || contains(name, `FACE`)]'
```

Then switch CLI credentials to the **target** account before anything else.

---

## 1. Remote Terraform state (once per account)

The script refuses the lab account. It creates an S3 bucket and DynamoDB lock
table, then prints a backend block.

```bash
bash scripts/create_remote_state.sh
```

Paste the printed block into `versions.tf` inside the existing `terraform { }`
block, for example:

```hcl
terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "hireme-tfstate-ACCOUNTID"
    key            = "hireme/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "hireme-terraform-locks"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
```

---

## 2. `terraform.tfvars`

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit the file. Minimum that must not stay as placeholders:

```hcl
create_lambda_role = true
enable_amplify     = true
enable_cloudfront  = false
enable_agent       = true
agent_desired_count = 0          # stay at 0 until image + secret exist

hr_simli_face_id        = "<lab HR SIMLI_FACE_ID>"
technical_simli_face_id = "dd10cb5a-d31d-4f12-b69f-6db3383c006e"

livekit_url        = "wss://your-project.livekit.cloud"
livekit_api_key    = "...."
livekit_api_secret = "...."
openai_api_key     = "...."      # CV Lambda; empty = mock fallback
openai_model       = "gpt-4.1-mini"

amplify_branch_name = "may-dev"
github_repository   = "https://github.com/MayaandMayOrganization/HireMe"
```

GitHub (pick one):

**A — Terraform connects Git (recommended)**

```hcl
connect_github      = true
github_access_token = "<PAT with repo scope>"
```

**B — Connect later with CLI / console**

```hcl
connect_github      = false
github_access_token = ""
```

`terraform.tfvars` is gitignored. Do not commit it.

---

## 3. Package the Lambdas

Terraform deploys **zip files**, not the Python folders. This script builds
Linux x86_64 packages for Python 3.12 (works from macOS):

| Zip | Source |
| --- | --- |
| `.build/cv-service.zip` | `aws-services/cv-service-lambda` |
| `.build/token-generator.zip` | `aws-services/token-generator-lambda` |
| `.build/avatar-context.zip` | `terraform/lambda-src/avatar-context` |
| `.build/hr-flashcards.zip` | `terraform/lambda-src/hr-flashcards` |

```bash
bash scripts/package_lambdas.sh
ls -l .build/*.zip
```

First apply will fail if these zips are missing.

---

## 4. First `terraform apply`

This creates IAM, Cognito, DynamoDB (app table + HR questions), audio/frontend
buckets, four Lambdas, HTTP API, Amplify, ECR, ECS cluster/service at
**desired count 0**, empty Secrets Manager secret, and a small public VPC.

```bash
terraform init -reconfigure
terraform plan
terraform apply
```

Keep the outputs:

```bash
terraform output
```

You will use:

- `application_url`
- `amplify_app_id`
- `api_endpoint`
- `cognito_user_pool_id` / `cognito_user_pool_client_id`
- `hr_questions_table_name`
- `agent_ecr_repository_url`
- `agent_secret_name`
- `agent_ecs_cluster_name` / `agent_ecs_service_name`

Lambda names (with defaults `project_name = hireme`, `environment = lab`):

- `hireme-lab-cv-service`
- `hireme-lab-token-generator`
- `hireme-lab-avatar-context`
- `hireme-lab-hr-flashcards`

Env vars Terraform already set on those functions:

- **cv-service:** `COGNITO_USER_POOL_ID`, `DYNAMODB_TABLE`, `AUDIO_BUCKET`, `OPENAI_API_KEY`, `OPENAI_MODEL`
- **token-generator:** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `HR_QUESTIONS_TABLE`
- **avatar-context:** `DYNAMODB_TABLE`
- **hr-flashcards:** `HR_QUESTIONS_TABLE`

Simli face IDs are **not** Lambda env vars. They go on the ECS task from
`hr_simli_face_id` / `technical_simli_face_id`.

---

## 5. Secrets Manager (agent keys)

Terraform creates an empty secret. Faces stay in tfvars. **API keys** go here.

```bash
cat > /tmp/hireme-agent-secret.json <<EOF
{
  "LIVEKIT_URL": "$(terraform output -json | python3 -c 'import json,sys; print(json.load(sys.stdin)["frontend_build_environment"]["value"]["VITE_LIVEKIT_URL"])')",
  "LIVEKIT_API_KEY": "replace-me",
  "LIVEKIT_API_SECRET": "replace-me",
  "OPENAI_API_KEY": "replace-me",
  "SIMLI_API_KEY": "replace-me",
  "DEEPGRAM_API_KEY": "replace-me",
  "CARTESIA_API_KEY": "replace-me"
}
EOF
```

Edit `/tmp/hireme-agent-secret.json` so LiveKit matches `terraform.tfvars`
exactly (token Lambda and agent must be the same LiveKit project). Then:

```bash
aws secretsmanager put-secret-value \
  --secret-id "$(terraform output -raw agent_secret_name)" \
  --secret-string file:///tmp/hireme-agent-secret.json
rm /tmp/hireme-agent-secret.json
```

Check the secret exists (does not print values):

```bash
aws secretsmanager describe-secret \
  --secret-id "$(terraform output -raw agent_secret_name)" \
  --query '{name:Name,arn:ARN}'
```

To rotate later, run `put-secret-value` again, then force a new ECS
deployment so tasks pick up the new version:

```bash
aws ecs update-service \
  --cluster "$(terraform output -raw agent_ecs_cluster_name)" \
  --service "$(terraform output -raw agent_ecs_service_name)" \
  --force-new-deployment
```

---

## 6. GitHub → Amplify

Amplify injects Cognito IDs and LiveKit URL at **build** time and rewrites
`/api/*` to API Gateway. Until a branch is connected and built, there is no
working website.

### Option A — already set `connect_github = true`

Terraform attached the repo and created branch `may-dev` with auto-build.
Push the branch (or start a job):

```bash
# from HireMe repo root, if may-dev is already on GitHub:
git push origin may-dev

APP_ID="$(terraform output -raw amplify_app_id)"
BRANCH="$(terraform output -raw amplify_branch_name)"
aws amplify start-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-type RELEASE
aws amplify list-jobs --app-id "$APP_ID" --branch-name "$BRANCH" --max-items 1 \
  --query 'jobSummaries[0].{status:status,started:startTime,ended:endTime}' \
  --output table
```

Wait until `status` is `SUCCEED`.

### Option B — connect with CLI after apply

Create a GitHub **classic** PAT: GitHub → Settings → Developer settings →
Personal access tokens → Tokens (classic) → `repo` scope.

```bash
APP_ID="$(terraform output -raw amplify_app_id)"
BRANCH="$(terraform output -raw amplify_branch_name)"

aws amplify update-app \
  --app-id "$APP_ID" \
  --repository "https://github.com/MayaandMayOrganization/HireMe" \
  --access-token "github_pat_or_classic_token"

aws amplify create-branch \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH" \
  --enable-auto-build \
  --framework Web

aws amplify start-job \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH" \
  --job-type RELEASE
```

If `create-branch` says the branch already exists, skip it and only
`start-job`.

### Option C — Amplify console

Hosting → the `hireme-lab` app → Connect repository → GitHub →
`MayaandMayOrganization/HireMe` → branch `may-dev`. Env vars are already on
the Amplify app from Terraform; do not replace them with lab Cognito IDs.

### Confirm the site

```bash
terraform output -raw application_url
```

Sign up a **new** user. Lab Cognito users are not in this pool.

---

## 7. Agent image (ECR)

```bash
REPOSITORY="$(terraform output -raw agent_ecr_repository_url)"
REGISTRY="${REPOSITORY%/*}"
REGION="$(terraform output -json frontend_build_environment | jq -r .VITE_AWS_REGION)"

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

docker build --platform linux/amd64 -t "$REPOSITORY:latest" ../hireme-agent
docker push "$REPOSITORY:latest"
```

---

## 8. Seed HR questions

HR interviews fail until the pool has at least five rows (token Lambda check).

```bash
python3 -m pip install boto3
python3 scripts/seed_hr_questions.py \
  --table "$(terraform output -raw hr_questions_table_name)" \
  --region "$REGION"
```

---

## 9. Start ECS (second apply)

In `terraform.tfvars`:

```hcl
agent_desired_count = 1
```

```bash
terraform apply
aws ecs describe-services \
  --cluster "$(terraform output -raw agent_ecs_cluster_name)" \
  --services "$(terraform output -raw agent_ecs_service_name)" \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}' \
  --output table
```

Wait until `running` is `1`. Fargate bills while count is above 0.

Stop later:

```bash
# either
#   set agent_desired_count = 0 in tfvars and terraform apply
# or
aws ecs update-service \
  --cluster "$(terraform output -raw agent_ecs_cluster_name)" \
  --service "$(terraform output -raw agent_ecs_service_name)" \
  --desired-count 0
```

---

## 10. Smoke test

```bash
API="$(terraform output -raw api_endpoint)"
curl "$API/api/hr-flashcards"
curl "$API/api/avatar-context?userId=test&sortKey=test"
```

In the browser (`application_url`):

1. Sign up, confirm email, log in
2. Set target role
3. HR interview (HR face + pool); Leave → dashboard; End & feedback → report
4. Technical interview (technical face + male Cartesia voice)
5. Flashcards and CV save

CV `/api/cv/*` needs a Cognito ID token; those curls without auth should 401.

---

## Later updates (not first deploy)

### Lambda code

```bash
cd terraform
bash scripts/package_lambdas.sh
terraform apply
```

That updates functions because `source_code_hash` tracks the zip.

CLI-only (same zips, no Terraform):

```bash
PREFIX="hireme-lab"   # ${project_name}-${environment}
aws lambda update-function-code --function-name "${PREFIX}-cv-service" \
  --zip-file fileb://.build/cv-service.zip --no-cli-pager
aws lambda update-function-code --function-name "${PREFIX}-token-generator" \
  --zip-file fileb://.build/token-generator.zip --no-cli-pager
aws lambda update-function-code --function-name "${PREFIX}-avatar-context" \
  --zip-file fileb://.build/avatar-context.zip --no-cli-pager
aws lambda update-function-code --function-name "${PREFIX}-hr-flashcards" \
  --zip-file fileb://.build/hr-flashcards.zip --no-cli-pager
```

If you change Lambda **environment** (LiveKit, table names, OpenAI), change
`terraform.tfvars` / `main.tf` and `terraform apply`. Do not fight Terraform
with one-off `update-function-configuration` unless you intend to.

### Frontend

Push `may-dev`; Amplify auto-builds if the repo is connected.

```bash
APP_ID="$(terraform output -raw amplify_app_id)"
BRANCH="$(terraform output -raw amplify_branch_name)"
aws amplify list-jobs --app-id "$APP_ID" --branch-name "$BRANCH" --max-items 1 \
  --query 'jobSummaries[0].{status:status,ended:endTime,commit:commitMessage}' \
  --output table
```

Manual rebuild: `aws amplify start-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-type RELEASE`

Or: `bash scripts/deploy_frontend.sh`

### Agent (`agent.py`, voices, Docker)

Rebuild and push the image (section 7), then:

```bash
aws ecs update-service \
  --cluster "$(terraform output -raw agent_ecs_cluster_name)" \
  --service "$(terraform output -raw agent_ecs_service_name)" \
  --force-new-deployment
```

### Simli faces

Change `hr_simli_face_id` / `technical_simli_face_id` in `terraform.tfvars`,
then `terraform apply`. No secret update.

---

## What apply does **not** do

| Step | Why |
| --- | --- |
| Fill Secrets Manager | Empty secret is created; you `put-secret-value` |
| Build/push Docker | Image is not in Terraform |
| Seed HR questions | Table is empty until the Python script |
| Start avatars | `agent_desired_count` starts at 0 on purpose |
| Connect GitHub | Only if `connect_github = true` with a PAT |
| Copy lab users/data | New Cognito pool and empty DynamoDB |

---

## Destroy

```bash
# scale agent to 0 first if you want a cleaner teardown
terraform destroy
```

S3 buckets use `force_destroy` for this stack. Do not copy that setting
unchanged for production data you care about.
