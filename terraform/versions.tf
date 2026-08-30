terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "hireme-tfstate-765148471979"
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
