#!/usr/bin/env bash
set -euo pipefail

# Creates S3 + DynamoDB for Terraform remote state in the CURRENT AWS account.
# Refuses the Academy lab account. Does not run terraform apply.

LAB_ACCOUNT="590183800076"
REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
NAME_PREFIX="${1:-hireme}"

IDENTITY="$(aws sts get-caller-identity --output json)"
ACCOUNT="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["Account"])' <<<"${IDENTITY}")"
ARN="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["Arn"])' <<<"${IDENTITY}")"

if [[ "${ACCOUNT}" == "${LAB_ACCOUNT}" ]]; then
  echo "Refusing to create remote state in the AWS Academy lab (${LAB_ACCOUNT})."
  echo "Sign in to the other account first: aws sts get-caller-identity"
  exit 1
fi

BUCKET="${NAME_PREFIX}-tfstate-${ACCOUNT}"
TABLE="${NAME_PREFIX}-terraform-locks"

echo "Account: ${ACCOUNT}"
echo "Identity: ${ARN}"
echo "Region:  ${REGION}"
echo "Bucket:  ${BUCKET}"
echo "Table:   ${TABLE}"
echo

if aws s3api head-bucket --bucket "${BUCKET}" >/dev/null 2>&1; then
  echo "S3 bucket already exists."
else
  if [[ "${REGION}" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}"
  else
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}" \
      --create-bucket-configuration LocationConstraint="${REGION}"
  fi
  echo "Created S3 bucket."
fi

aws s3api put-bucket-versioning --bucket "${BUCKET}" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket "${BUCKET}" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block --bucket "${BUCKET}" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

if aws dynamodb describe-table --table-name "${TABLE}" --region "${REGION}" >/dev/null 2>&1; then
  echo "DynamoDB lock table already exists."
else
  aws dynamodb create-table \
    --table-name "${TABLE}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}" >/dev/null
  aws dynamodb wait table-exists --table-name "${TABLE}" --region "${REGION}"
  echo "Created DynamoDB lock table."
fi

cat <<EOF

Remote state is ready in this account.

1. Paste this inside the terraform { } block in versions.tf:

  backend "s3" {
    bucket         = "${BUCKET}"
    key            = "hireme/terraform.tfstate"
    region         = "${REGION}"
    dynamodb_table = "${TABLE}"
    encrypt        = true
  }

2. Then run:

  terraform init -reconfigure
  terraform plan
  terraform apply

EOF
