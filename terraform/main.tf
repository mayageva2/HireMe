data "aws_iam_role" "academy" {
  count = var.lambda_role_arn == null ? 1 : 0
  name  = var.academy_role_name
}

locals {
  name_prefix     = "${lower(var.project_name)}-${lower(var.environment)}"
  lambda_role_arn = coalesce(var.lambda_role_arn, try(data.aws_iam_role.academy[0].arn, null))

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

module "storage" {
  source = "./modules/storage"

  name_prefix = local.name_prefix
  tags        = local.common_tags
}

module "cognito" {
  source = "./modules/cognito"

  name_prefix = local.name_prefix
  tags        = local.common_tags
}

module "lambdas" {
  source = "./modules/lambda"

  name_prefix = local.name_prefix
  role_arn    = local.lambda_role_arn
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
      }
    }

    hr-flashcards = {
      zip_path    = "${path.root}/.build/hr-flashcards.zip"
      timeout     = 5
      memory_size = 128
      environment = {}
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

module "cdn" {
  source = "./modules/cdn"

  name_prefix                          = local.name_prefix
  frontend_bucket_id                   = module.storage.frontend_bucket_id
  frontend_bucket_arn                  = module.storage.frontend_bucket_arn
  frontend_bucket_regional_domain_name = module.storage.frontend_bucket_regional_domain_name
  api_domain_name                      = module.api_gateway.api_domain_name
  tags                                 = local.common_tags
}
