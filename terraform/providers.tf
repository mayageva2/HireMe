provider "aws" {
  region = var.aws_region

  # Empty means "use the environment", which is how AWS Academy credentials work.
  profile = var.aws_profile != "" ? var.aws_profile : null

  default_tags {
    tags = local.common_tags
  }
}
