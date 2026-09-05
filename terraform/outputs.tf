output "application_url" {
  description = "Amplify URL by default. CloudFront URL only if enable_cloudfront is true."
  value = var.enable_amplify ? module.amplify[0].branch_url : (
    var.enable_cloudfront ? module.cdn[0].url : "http://${module.storage.frontend_bucket_id}.s3-website-${var.aws_region}.amazonaws.com"
  )
}

output "amplify_app_id" {
  value = var.enable_amplify ? module.amplify[0].app_id : ""
}

output "amplify_branch_name" {
  value = var.amplify_branch_name
}

output "cloudfront_distribution_id" {
  value = var.enable_cloudfront ? module.cdn[0].distribution_id : ""
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

output "agent_ecr_repository_url" {
  value = var.enable_agent ? module.agent[0].ecr_repository_url : ""
}

output "agent_ecs_cluster_name" {
  value = var.enable_agent ? module.agent[0].ecs_cluster_name : ""
}

output "agent_ecs_service_name" {
  value = var.enable_agent ? module.agent[0].ecs_service_name : ""
}

output "agent_secret_name" {
  value = var.enable_agent ? module.agent[0].secret_name : ""
}

output "hr_simli_face_id" {
  value = var.hr_simli_face_id
}

output "technical_simli_face_id" {
  value = var.technical_simli_face_id
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
  description = "Values Amplify injects at build time, and deploy_frontend.sh can write locally."
  value = {
    VITE_AWS_REGION                  = var.aws_region
    VITE_COGNITO_USER_POOL_ID        = module.cognito.user_pool_id
    VITE_COGNITO_USER_POOL_CLIENT_ID = module.cognito.user_pool_client_id
    VITE_LIVEKIT_URL                 = var.livekit_url
    VITE_HR_FLASHCARDS_URL           = "/api/hr-flashcards"
  }
}
