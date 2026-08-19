output "application_url" {
  description = "CloudFront HTTPS URL when enable_cloudfront is true, otherwise the S3 website URL."
  value       = module.cdn.url
}

output "cloudfront_distribution_id" {
  value = module.cdn.distribution_id
}

output "frontend_bucket_name" {
  value = module.storage.frontend_bucket_id
}

output "audio_bucket_name" {
  value = module.storage.audio_bucket_id
}

output "dynamodb_table_name" {
  value = module.storage.dynamodb_table_name
}

output "hr_questions_table_name" {
  value = module.storage.hr_questions_table_name
}

output "lambda_role_arn" {
  value = module.iam.role_arn
}

output "cognito_user_pool_id" {
  value = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  value = module.cognito.user_pool_client_id
}

output "api_endpoint" {
  value = module.api_gateway.api_endpoint
}

output "frontend_build_environment" {
  description = "Values to place in frontend/.env.production before npm run build."
  value = {
    VITE_AWS_REGION                  = var.aws_region
    VITE_COGNITO_USER_POOL_ID        = module.cognito.user_pool_id
    VITE_COGNITO_USER_POOL_CLIENT_ID = module.cognito.user_pool_client_id
    VITE_LIVEKIT_URL                 = var.livekit_url
    VITE_HR_FLASHCARDS_URL           = "/api/hr-flashcards"
  }
}
