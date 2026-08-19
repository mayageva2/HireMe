data "aws_caller_identity" "current" {}

locals {
  bucket_prefix  = lower(replace(var.name_prefix, "_", "-"))
  account_suffix = data.aws_caller_identity.current.account_id
}

resource "aws_s3_bucket" "frontend" {
  bucket        = "${local.bucket_prefix}-frontend-${local.account_suffix}"
  force_destroy = true
  tags          = merge(var.tags, { Name = "${var.name_prefix}-frontend" })
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = !var.public_website
  block_public_policy     = !var.public_website
  ignore_public_acls      = !var.public_website
  restrict_public_buckets = !var.public_website
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket" "audio" {
  bucket        = "${local.bucket_prefix}-audio-${local.account_suffix}"
  force_destroy = true
  tags          = merge(var.tags, { Name = "${var.name_prefix}-audio" })
}

resource "aws_s3_bucket_public_access_block" "audio" {
  bucket                  = aws_s3_bucket.audio.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id
  rule {
    id     = "expire-old-recordings"
    status = "Enabled"
    filter {}
    expiration {
      days = 90
    }
  }
}

resource "aws_dynamodb_table" "main" {
  name         = "${var.name_prefix}-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "User id"
  range_key    = "Sort Key"

  attribute {
    name = "User id"
    type = "S"
  }

  attribute {
    name = "Sort Key"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-table" })
}

resource "aws_dynamodb_table" "hr_questions" {
  name         = "${var.name_prefix}-hr-questions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-hr-questions" })
}
