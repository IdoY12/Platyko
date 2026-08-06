#!/bin/sh
set -e

awslocal s3 mb s3://platybit-avatars || true
awslocal s3api put-bucket-cors \
  --bucket platybit-avatars \
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
