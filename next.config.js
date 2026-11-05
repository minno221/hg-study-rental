const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // "@/lib/..." 같은 줄임 주소가 항상 프로젝트 맨 위 폴더를 가리키도록 직접 알려줘요
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

module.exports = nextConfig;
