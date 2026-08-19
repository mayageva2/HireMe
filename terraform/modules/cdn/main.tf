variable "name_prefix" {
  type = string
}

variable "frontend_bucket_id" {
  type = string
}

variable "frontend_bucket_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}

# AWS Academy voclabs cannot create CloudFront. The lab hosts the SPA on a
# public S3 website (hireme-web) and uses Amplify rewrites in production.
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = var.frontend_bucket_id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

data "aws_iam_policy_document" "frontend" {
  statement {
    sid       = "PublicReadGetObject"
    actions   = ["s3:GetObject"]
    resources = ["${var.frontend_bucket_arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = var.frontend_bucket_id
  policy = data.aws_iam_policy_document.frontend.json
}

output "website_endpoint" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "website_domain" {
  value = aws_s3_bucket_website_configuration.frontend.website_domain
}
