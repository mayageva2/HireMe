data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_ecr_repository" "agent" {
  name                 = "${var.name_prefix}-agent"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

resource "aws_ecr_lifecycle_policy" "agent" {
  repository = aws_ecr_repository.agent.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the newest 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_secretsmanager_secret" "agent" {
  name                    = "${var.name_prefix}/agent"
  recovery_window_in_days = 0
  tags                    = var.tags
}

resource "aws_cloudwatch_log_group" "agent" {
  name              = "/ecs/${var.name_prefix}-agent"
  retention_in_days = 14
  tags              = var.tags
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.name_prefix}-agent-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.agent.arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "${var.name_prefix}-agent-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-agent-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = var.tags
}

data "aws_iam_policy_document" "task" {
  statement {
    sid = "InterviewTables"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:Scan",
    ]
    resources = [var.main_table_arn, var.hr_questions_table_arn]
  }
}

resource "aws_iam_role_policy" "task" {
  name   = "${var.name_prefix}-agent"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task.json
}

resource "aws_vpc" "agent" {
  count                = var.create_network ? 1 : 0
  cidr_block           = "10.42.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = merge(var.tags, { Name = "${var.name_prefix}-agent" })
}

resource "aws_internet_gateway" "agent" {
  count  = var.create_network ? 1 : 0
  vpc_id = aws_vpc.agent[0].id
  tags   = var.tags
}

resource "aws_subnet" "agent" {
  count                   = var.create_network ? 2 : 0
  vpc_id                  = aws_vpc.agent[0].id
  cidr_block              = cidrsubnet(aws_vpc.agent[0].cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = merge(var.tags, { Name = "${var.name_prefix}-agent-${count.index + 1}" })
}

resource "aws_route_table" "agent" {
  count  = var.create_network ? 1 : 0
  vpc_id = aws_vpc.agent[0].id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.agent[0].id
  }
  tags = var.tags
}

resource "aws_route_table_association" "agent" {
  count          = var.create_network ? 2 : 0
  subnet_id      = aws_subnet.agent[count.index].id
  route_table_id = aws_route_table.agent[0].id
}

locals {
  vpc_id     = var.create_network ? aws_vpc.agent[0].id : var.existing_vpc_id
  subnet_ids = var.create_network ? aws_subnet.agent[*].id : var.existing_subnet_ids
  secret_keys = [
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "OPENAI_API_KEY",
    "SIMLI_API_KEY",
    "DEEPGRAM_API_KEY",
    "CARTESIA_API_KEY",
  ]
}

resource "aws_security_group" "agent" {
  name        = "${var.name_prefix}-agent"
  description = "Outbound access for the HireMe LiveKit agent"
  vpc_id      = local.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

resource "aws_ecs_cluster" "agent" {
  name = "${var.name_prefix}-agent"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = var.tags
}

resource "aws_ecs_task_definition" "agent" {
  family                   = "${var.name_prefix}-agent"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = "agent"
    image     = "${aws_ecr_repository.agent.repository_url}:${var.image_tag}"
    essential = true
    environment = [
      { name = "AWS_REGION", value = var.aws_region },
      { name = "DYNAMODB_TABLE", value = var.main_table_name },
      { name = "HR_QUESTIONS_TABLE", value = var.hr_questions_table_name },
      { name = "INTERVIEW_FEEDBACK_SINK", value = "dynamodb" },
      { name = "OPENAI_MODEL", value = var.openai_model },
      { name = "HR_SIMLI_FACE_ID", value = var.hr_simli_face_id },
      { name = "TECHNICAL_SIMLI_FACE_ID", value = var.technical_simli_face_id },
    ]
    secrets = [
      for key in local.secret_keys : {
        name      = key
        valueFrom = "${aws_secretsmanager_secret.agent.arn}:${key}::"
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.agent.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "agent"
      }
    }
  }])

  lifecycle {
    precondition {
      condition     = length(trimspace(var.hr_simli_face_id)) > 0
      error_message = "hr_simli_face_id must be set when the ECS agent is enabled."
    }
  }

  tags = var.tags
}

resource "aws_ecs_service" "agent" {
  name            = "${var.name_prefix}-agent"
  cluster         = aws_ecs_cluster.agent.id
  task_definition = aws_ecs_task_definition.agent.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = local.subnet_ids
    security_groups  = [aws_security_group.agent.id]
    assign_public_ip = true
  }

  depends_on = [aws_iam_role_policy_attachment.execution]
  tags       = var.tags

  lifecycle {
    precondition {
      condition = var.create_network || (
        var.existing_vpc_id != null && length(var.existing_subnet_ids) >= 2
      )
      error_message = "Provide an existing VPC and at least two subnets when create_network is false."
    }
  }
}
