data "aws_iam_role" "academy" {
  count = var.create_lambda_role || var.lambda_role_arn != null ? 0 : 1
  name  = var.academy_role_name
}

locals {
  name_prefix = "${lower(var.project_name)}-${lower(var.environment)}"

  # Only resolved when Terraform is not creating the role itself.
  existing_lambda_role_arn = var.create_lambda_role ? null : (
    var.lambda_role_arn != null ? var.lambda_role_arn : data.aws_iam_role.academy[0].arn
  )

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

module "storage" {
  source = "./modules/storage"

  name_prefix    = local.name_prefix
  public_website = !var.enable_cloudfront && !var.enable_amplify
  tags           = local.common_tags
}

module "iam" {
  source = "./modules/iam"

  name_prefix         = local.name_prefix
  create              = var.create_lambda_role
  existing_role_arn   = local.existing_lambda_role_arn
  dynamodb_table_arns = [module.storage.dynamodb_table_arn, module.storage.hr_questions_table_arn]
  audio_bucket_arn    = module.storage.audio_bucket_arn
  tags                = local.common_tags
}

module "cognito" {
  source = "./modules/cognito"

  name_prefix = local.name_prefix
  tags        = local.common_tags
}

module "lambdas" {
  source = "./modules/lambda"

  name_prefix = local.name_prefix
  role_arn    = module.iam.role_arn
  tags        = local.common_tags

  functions = {
    cv-service = {
      zip_path    = "${path.root}/.build/cv-service.zip"
      timeout     = 60
      memory_size = 512
      environment = {
        COGNITO_USER_POOL_ID = module.cognito.user_pool_id
        DYNAMODB_TABLE       = module.storage.dynamodb_table_name
        AUDIO_BUCKET         = module.storage.audio_bucket_id
        OPENAI_API_KEY       = var.openai_api_key
        OPENAI_MODEL         = var.openai_model
      }
    }

    avatar-context = {
      zip_path    = "${path.root}/.build/avatar-context.zip"
      timeout     = 10
      memory_size = 128
      environment = {
        DYNAMODB_TABLE = module.storage.dynamodb_table_name
      }
    }

    token-generator = {
      zip_path    = "${path.root}/.build/token-generator.zip"
      timeout     = 15
      memory_size = 256
      environment = {
        LIVEKIT_URL        = var.livekit_url
        LIVEKIT_API_KEY    = var.livekit_api_key
        LIVEKIT_API_SECRET = var.livekit_api_secret
        HR_QUESTIONS_TABLE = module.storage.hr_questions_table_name
      }
    }

    hr-flashcards = {
      zip_path    = "${path.root}/.build/hr-flashcards.zip"
      timeout     = 5
      memory_size = 128
      environment = {
        HR_QUESTIONS_TABLE = module.storage.hr_questions_table_name
      }
    }
  }
}

module "api_gateway" {
  source = "./modules/api_gateway"

  name_prefix           = local.name_prefix
  lambda_invoke_arns    = module.lambdas.invoke_arns
  lambda_function_names = module.lambdas.function_names
  cognito_issuer        = "https://cognito-idp.${var.aws_region}.amazonaws.com/${module.cognito.user_pool_id}"
  cognito_client_id     = module.cognito.user_pool_client_id
  allowed_origins       = var.allowed_origins
  tags                  = local.common_tags
}

module "agent" {
  count  = var.enable_agent ? 1 : 0
  source = "./modules/agent"

  name_prefix             = local.name_prefix
  aws_region              = var.aws_region
  image_tag               = var.agent_image_tag
  desired_count           = var.agent_desired_count
  main_table_arn          = module.storage.dynamodb_table_arn
  main_table_name         = module.storage.dynamodb_table_name
  hr_questions_table_arn  = module.storage.hr_questions_table_arn
  hr_questions_table_name = module.storage.hr_questions_table_name
  openai_model            = var.openai_model
  hr_simli_face_id        = var.hr_simli_face_id
  technical_simli_face_id = var.technical_simli_face_id
  create_network          = var.agent_create_network
  existing_vpc_id         = var.agent_existing_vpc_id
  existing_subnet_ids     = var.agent_existing_subnet_ids
  tags                    = local.common_tags
}

module "cdn" {
  count  = var.enable_cloudfront ? 1 : 0
  source = "./modules/cdn"

  name_prefix                          = local.name_prefix
  enable_cloudfront                    = true
  frontend_bucket_id                   = module.storage.frontend_bucket_id
  frontend_bucket_arn                  = module.storage.frontend_bucket_arn
  frontend_bucket_regional_domain_name = module.storage.frontend_bucket_regional_domain_name
  api_domain_name                      = module.api_gateway.api_domain_name
  tags                                 = local.common_tags
}

module "amplify" {
  count  = var.enable_amplify ? 1 : 0
  source = "./modules/amplify"

  name_prefix          = local.name_prefix
  api_endpoint         = module.api_gateway.api_endpoint
  connect_repository   = var.connect_github
  github_repository    = var.github_repository
  github_access_token  = var.github_access_token
  iam_service_role_arn = var.amplify_iam_service_role_arn
  branch_name          = var.amplify_branch_name
  tags                 = local.common_tags
  environment_variables = {
    VITE_AWS_REGION                  = var.aws_region
    VITE_COGNITO_USER_POOL_ID        = module.cognito.user_pool_id
    VITE_COGNITO_USER_POOL_CLIENT_ID = module.cognito.user_pool_client_id
    VITE_LIVEKIT_URL                 = var.livekit_url
    VITE_HR_FLASHCARDS_URL           = "/api/hr-flashcards"
  }
}
