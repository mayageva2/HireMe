#!/usr/bin/env bash
set -euo pipefail

TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$(cd "${TERRAFORM_DIR}/.." && pwd)"
BUILD_DIR="${TERRAFORM_DIR}/.build"

rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

package_lambda() {
  local name="$1"
  local source_dir="$2"
  local requirements_file="${3:-}"
  local package_dir="${BUILD_DIR}/${name}"

  mkdir -p "${package_dir}"

  if [[ -n "${requirements_file}" ]]; then
    python3 -m pip install \
      --requirement "${requirements_file}" \
      --target "${package_dir}" \
      --platform manylinux2014_x86_64 \
      --implementation cp \
      --python-version 3.12 \
      --only-binary=:all: \
      --upgrade
  fi

  cp "${source_dir}/lambda_function.py" "${package_dir}/lambda_function.py"

  PACKAGE_DIR="${package_dir}" OUTPUT="${BUILD_DIR}/${name}.zip" python3 - <<'PY'
import os
import pathlib
import shutil

package_dir = pathlib.Path(os.environ["PACKAGE_DIR"])
output = pathlib.Path(os.environ["OUTPUT"])
archive = shutil.make_archive(str(output.with_suffix("")), "zip", package_dir)
print(f"Created {archive}")
PY
}

package_lambda \
  "cv-service" \
  "${PROJECT_DIR}/aws-services/cv-service-lambda" \
  "${PROJECT_DIR}/aws-services/cv-service-lambda/requirements.txt"

package_lambda \
  "token-generator" \
  "${PROJECT_DIR}/aws-services/token-generator-lambda" \
  "${PROJECT_DIR}/aws-services/token-generator-lambda/requirements.txt"

package_lambda \
  "avatar-context" \
  "${TERRAFORM_DIR}/lambda-src/avatar-context"

package_lambda \
  "hr-flashcards" \
  "${TERRAFORM_DIR}/lambda-src/hr-flashcards"
