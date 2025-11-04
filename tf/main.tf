resource "aws_s3_bucket" "mixnmatch_site" {
  bucket = "mixnmatch-site"
  force_destroy = true
}

resource "aws_s3_bucket_website_configuration" "mixnmatch_site" {
  bucket = aws_s3_bucket.mixnmatch_site.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "mixnmatch_site" {
  bucket                  = aws_s3_bucket.mixnmatch_site.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

data "aws_iam_policy_document" "public_read" {
  statement {
    sid = "PublicReadForWebsite"
    effect = "Allow"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.mixnmatch_site.arn}/*"]
  }
}

resource "aws_s3_bucket_policy" "public_policy" {
  bucket = aws_s3_bucket.mixnmatch_site.id
  policy = data.aws_iam_policy_document.public_read.json
}

resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.mixnmatch_site.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

