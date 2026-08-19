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

Amazon Transcribe is an API consumed by backend code, not a persistent
resource that Terraform creates. The audio bucket is ready for recordings and
transcription jobs. The current application agent uses LiveKit/Deepgram for
speech-to-text; add `transcribe:StartTranscriptionJob` and S3 access to a custom
Lambda role when the backend starts calling Amazon Transcribe.

Simli, LiveKit, and OpenAI are external services. Terraform only passes their
configuration to the existing application code.

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

## 4. Create the infrastructure

```bash
terraform init
terraform fmt -recursive
terraform validate
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
