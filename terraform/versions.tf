terraform {
  required_version = ">= 1.6.0"

  # After running scripts/create_remote_state.sh in the TARGET account,
  # paste the printed backend "s3" { ... } block here, then:
  #   terraform init -reconfigure && terraform apply

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
