#!/bin/bash
# Deploy script — Gestão Financeira
# Uso: bash deploy.sh

SERVER="root@137.184.195.81"
APP_DIR="/app"

echo "🔨 Buildando aplicação..."
NUXT_IGNORE_LOCK=1 npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build falhou. Abortando."
  exit 1
fi

echo "🔍 Verificando bundle..."
if [ ! -f ".output/server/chunks/_/nitro.mjs" ]; then
  echo "❌ Bundle não encontrado. Abortando."
  exit 1
fi

echo "📦 Enviando .output para o servidor..."
scp -r .output "$SERVER:$APP_DIR/"
if [ $? -ne 0 ]; then
  echo "❌ Falha no envio. Abortando."
  exit 1
fi

echo "🔧 Corrigindo binário do better-sqlite3 e reiniciando..."
ssh "$SERVER" "
  rm -rf $APP_DIR/.output/server/node_modules/better-sqlite3 &&
  cp -r $APP_DIR/node_modules/better-sqlite3 $APP_DIR/.output/server/node_modules/ &&
  cd $APP_DIR && pm2 reload financas
"

echo ""
echo "✅ Deploy concluído! http://137.184.195.81"
