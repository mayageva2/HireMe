#!/usr/bin/env bash
set -euo pipefail

TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$(cd "${TERRAFORM_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/frontend/.env.production"

terraform -chdir="${TERRAFORM_DIR}" output -json frontend_build_environment \
  | ENV_FILE="${ENV_FILE}" python3 -c '
import json
import os
import sys

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
