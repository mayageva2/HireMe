output "website_endpoint" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "distribution_id" {
  value = var.enable_cloudfront ? aws_cloudfront_distribution.this[0].id : ""
}

output "domain_name" {
  value = var.enable_cloudfront ? aws_cloudfront_distribution.this[0].domain_name : aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "url" {
  value = var.enable_cloudfront ? "https://${aws_cloudfront_distribution.this[0].domain_name}" : "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}
