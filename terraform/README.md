# HireMe AWS infrastructure

This root Terraform stack reproduces the serverless architecture from the
project document:

- `modules/iam`: Lambda execution role. Skip in AWS Academy with
  `create_lambda_role = false` and use `LabRole`.
- `modules/storage`: audio bucket, app table, HR questions table.
- `modules/cognito`: Cognito user pool and browser app client.
- `modules/lambda`: CV, avatar-context, HR flashcard, and LiveKit token functions.
- `modules/api_gateway`: HTTP API for `/api/cv`, `/api/avatar-context`,
  `/api/livekit-token`, and `/api/hr-flashcards`.
- `modules/amplify`: Amplify app that hosts the React SPA and rewrites `/api/*`
  to API Gateway, matching the current lab.
- `modules/agent`: optional ECR repository and ECS Fargate service for the
  LiveKit/Simli interview worker.

Each module has `main.tf`, `variables.tf`, and `outputs.tf`. The root module
uses the same split (`main.tf`, `variables.tf`, `outputs.tf`, `providers.tf`).

Amazon Transcribe is an API consumed by backend code, not a persistent
resource that Terraform creates. The audio bucket is ready for recordings and
transcription jobs. The current application agent uses LiveKit/Deepgram for
speech-to-text; add `transcribe:StartTranscriptionJob` and S3 access to a custom
Lambda role when the backend starts calling Amazon Transcribe.

Simli, LiveKit, OpenAI, Deepgram, and Cartesia are external services. Terraform
creates a Secrets Manager container for their agent credentials; you populate
the values after the bootstrap apply.

## 1. Configure temporary AWS Academy credentials

Start the Academy lab and export its temporary values in the terminal:

```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."
export AWS_DEFAULT_REGION="us-east-1"
aws sts get-caller-identity
```

Do not put AWS credentials in `.tf`, `.tfvars`, or Git. Academy session
credentials expire whenever the lab session ends; export the new values before
the next Terraform command.

In a normal AWS account leave the defaults: Terraform creates the Lambda role
and an Amplify app. In AWS Academy set `create_lambda_role = false` so the
stack uses `LabRole`. Do not apply this Amplify app into the existing lab
account unless you want a second HireMe Amplify app.

## 2. Configure application values

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit only the LiveKit values and, optionally, the OpenAI key. Sensitive
Terraform input values are still stored in local state, so keep
`terraform.tfstate` and `terraform.tfvars` private. Both are ignored by Git.

## 3. Package Lambda functions

The script installs Linux x86_64 Python dependencies so the packages work on
Lambda even when built on macOS:

```bash
bash scripts/package_lambdas.sh
```

## Deploy to a different AWS account

Do not run this while signed in to the Academy lab. The script refuses
account `590183800076`.

```bash
aws sts get-caller-identity
cd terraform
bash scripts/create_remote_state.sh
```

The script creates an S3 bucket and DynamoDB lock table, then prints a
`backend "s3"` block. Paste that block into `versions.tf` inside `terraform { }`.

```bash
cp terraform.tfvars.example terraform.tfvars
# set LiveKit keys and GitHub token if you want Amplify auto-connect
bash scripts/package_lambdas.sh
terraform init -reconfigure
terraform plan
terraform apply
```

Amplify hosts the frontend. After apply, connect the GitHub repo in the
Amplify console, or set `connect_github = true` with `github_access_token`, then
push `may-dev`. Amplify injects the new Cognito IDs at build time and proxies
`/api/*` to API Gateway.

```bash
terraform output -raw application_url
```

## Deploy the dual-avatar ECS agent

The worker supports both interviewers in one ECS service. LiveKit job metadata
selects HR or technical behavior and the matching Simli face for each room.
Fargate runs continuously and incurs cost while `agent_desired_count` is above
zero.

1. Set these values in `terraform.tfvars`:

```hcl
enable_agent            = true
agent_desired_count     = 0
hr_simli_face_id        = "your-current-hr-face-id"
technical_simli_face_id = "dd10cb5a-d31d-4f12-b69f-6db3383c006e"
```

2. Bootstrap the repository, cluster, network, roles, and empty secret:

```bash
terraform apply
```

3. Put credentials into Secrets Manager without committing them:

```bash
cat > /tmp/hireme-agent-secret.json <<'JSON'
{
  "LIVEKIT_URL": "wss://your-project.livekit.cloud",
  "LIVEKIT_API_KEY": "replace-me",
  "LIVEKIT_API_SECRET": "replace-me",
  "OPENAI_API_KEY": "replace-me",
  "SIMLI_API_KEY": "replace-me",
  "DEEPGRAM_API_KEY": "replace-me",
  "CARTESIA_API_KEY": "replace-me"
}
JSON
aws secretsmanager put-secret-value \
  --secret-id "$(terraform output -raw agent_secret_name)" \
  --secret-string file:///tmp/hireme-agent-secret.json
rm /tmp/hireme-agent-secret.json
```

4. Build and push the agent image:

```bash
REPOSITORY="$(terraform output -raw agent_ecr_repository_url)"
REGISTRY="${REPOSITORY%/*}"
aws ecr get-login-password --region "$(terraform output -json frontend_build_environment | jq -r .VITE_AWS_REGION)" |
  docker login --username AWS --password-stdin "$REGISTRY"
docker build --platform linux/amd64 -t "$REPOSITORY:latest" ../hireme-agent
docker push "$REPOSITORY:latest"
```

5. Seed the HR pool, then start the service:

```bash
python3 -m pip install boto3
python3 scripts/seed_hr_questions.py \
  --table "$(terraform output -raw hr_questions_table_name)" \
  --region "$(terraform output -json frontend_build_environment | jq -r .VITE_AWS_REGION)"
# Change agent_desired_count to 1 in terraform.tfvars
terraform apply
aws ecs describe-services \
  --cluster "$(terraform output -raw agent_ecs_cluster_name)" \
  --services "$(terraform output -raw agent_ecs_service_name)"
```

For an existing VPC set `agent_create_network = false`, then provide
`agent_existing_vpc_id` and at least two outbound-capable subnet IDs. AWS
Academy may block creation of the ECS IAM roles or network; keep
`enable_agent = false` there unless the lab grants those permissions.

## Useful checks

```bash
curl "$(terraform output -raw api_endpoint)/api/avatar-context?userId=test&sortKey=test"
curl "$(terraform output -raw api_endpoint)/api/hr-flashcards"
aws s3 ls "s3://$(terraform output -raw audio_bucket_name)"
```

The avatar request returns a default context when no matching profile exists.
CV routes require a valid Cognito ID token.

## Remove lab resources

```bash
terraform destroy
```

The S3 buckets use `force_destroy` for lab convenience. Do not use that setting
unchanged for production data.
