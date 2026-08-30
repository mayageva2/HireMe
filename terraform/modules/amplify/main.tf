locals {
  api = trimsuffix(var.api_endpoint, "/")

  build_spec = <<-YAML
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - nvm install 22
            - nvm use 22
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: frontend/dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
      redirects:
        - source: '/api/avatar-context'
          target: '${local.api}/api/avatar-context'
          status: '200'
        - source: '/api/avatar-context/<*>'
          target: '${local.api}/api/avatar-context/<*>'
          status: '200'
        - source: '/api/livekit-token'
          target: '${local.api}/api/livekit-token'
          status: '200'
        - source: '/api/livekit-token/<*>'
          target: '${local.api}/api/livekit-token/<*>'
          status: '200'
        - source: '/api/cv'
          target: '${local.api}/api/cv'
          status: '200'
        - source: '/api/cv/<*>'
          target: '${local.api}/api/cv/<*>'
          status: '200'
        - source: '/api/hr-flashcards'
          target: '${local.api}/api/hr-flashcards'
          status: '200'
        - source: '/api/hr-flashcards/<*>'
          target: '${local.api}/api/hr-flashcards/<*>'
          status: '200'
        - source: '/<*>'
          target: '/index.html'
          status: '404-200'
  YAML
}

resource "aws_amplify_app" "this" {
  name                     = var.name_prefix
  platform                 = "WEB"
  enable_branch_auto_build = var.connect_repository || var.github_repository != ""
  build_spec               = local.build_spec
  environment_variables    = var.environment_variables
  repository               = var.github_repository != "" ? var.github_repository : null
  access_token             = var.github_access_token != "" ? var.github_access_token : null
  iam_service_role_arn     = var.iam_service_role_arn != "" ? var.iam_service_role_arn : null
  tags                     = var.tags

  custom_rule {
    source = "/api/avatar-context"
    target = "${local.api}/api/avatar-context"
    status = "200"
  }

  custom_rule {
    source = "/api/avatar-context/<*>"
    target = "${local.api}/api/avatar-context/<*>"
    status = "200"
  }

  custom_rule {
    source = "/api/livekit-token"
    target = "${local.api}/api/livekit-token"
    status = "200"
  }

  custom_rule {
    source = "/api/livekit-token/<*>"
    target = "${local.api}/api/livekit-token/<*>"
    status = "200"
  }

  custom_rule {
    source = "/api/cv"
    target = "${local.api}/api/cv"
    status = "200"
  }

  custom_rule {
    source = "/api/cv/<*>"
    target = "${local.api}/api/cv/<*>"
    status = "200"
  }

  custom_rule {
    source = "/api/hr-flashcards"
    target = "${local.api}/api/hr-flashcards"
    status = "200"
  }

  custom_rule {
    source = "/api/hr-flashcards/<*>"
    target = "${local.api}/api/hr-flashcards/<*>"
    status = "200"
  }

  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "404-200"
  }

  lifecycle {
    ignore_changes = [
      iam_service_role_arn,
      repository,
      access_token,
      enable_branch_auto_build,
    ]
  }
}

resource "aws_amplify_branch" "this" {
  count = var.connect_repository ? 1 : 0

  app_id                = aws_amplify_app.this.id
  branch_name           = var.branch_name
  stage                 = "DEVELOPMENT"
  enable_auto_build     = true
  framework             = "Web"
  environment_variables = var.environment_variables
}
