#!/bin/sh
set -e

awslocal s3 mb s3://platyko-avatars || true
awslocal s3api put-bucket-cors \
  --bucket platyko-avatars \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }'
