#!/usr/bin/env bash
set -euo pipefail

TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="$(terraform -chdir="${TERRAFORM_DIR}" output -raw amplify_app_id)"

if [[ -n "${APP_ID}" ]]; then
  BRANCH_NAME="$(terraform -chdir="${TERRAFORM_DIR}" output -raw amplify_branch_name)"
  echo "Amplify hosts the frontend (same as the lab)."
  echo "Connect the GitHub repo in the Amplify console if it is not connected yet."
  echo "A push to ${BRANCH_NAME} will build with the Terraform Cognito IDs and API rewrites."
  aws amplify start-job \
    --app-id "${APP_ID}" \
    --branch-name "${BRANCH_NAME}" \
    --job-type RELEASE \
    >/dev/null 2>&1 || true
  terraform -chdir="${TERRAFORM_DIR}" output -raw application_url
  echo
  exit 0
fi

PROJECT_DIR="$(cd "${TERRAFORM_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/frontend/.env.production"

terraform -chdir="${TERRAFORM_DIR}" output -json frontend_build_environment \
  | ENV_FILE="${ENV_FILE}" python3 -c '
import json, os, sys
values = json.load(sys.stdin)
with open(os.environ["ENV_FILE"], "w", encoding="utf-8") as output:
    for key, value in values.items():
        output.write(f"{key}={value}\n")
'

(
  cd "${PROJECT_DIR}"
  npm ci
  npm run build
)

BUCKET="$(terraform -chdir="${TERRAFORM_DIR}" output -raw frontend_bucket_name)"
DISTRIBUTION="$(terraform -chdir="${TERRAFORM_DIR}" output -raw cloudfront_distribution_id)"

aws s3 sync "${PROJECT_DIR}/frontend/dist/" "s3://${BUCKET}/" --delete

if [[ -n "${DISTRIBUTION}" ]]; then
  aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION}" \
    --paths "/*"
fi

terraform -chdir="${TERRAFORM_DIR}" output -raw application_url
echo
