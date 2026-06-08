#!/bin/bash
# Deploy script - Gestao Financeira
# Uso: bash deploy.sh

SERVER="root@137.184.195.81"
APP_DIR="/app"
PACKAGE="gestao-output.tgz"

echo "Buildando aplicacao..."
NUXT_IGNORE_LOCK=1 npm run build
if [ $? -ne 0 ]; then
  echo "Build falhou. Abortando."
  exit 1
fi

echo "Verificando bundle..."
if [ ! -f ".output/server/chunks/_/nitro.mjs" ]; then
  echo "Bundle nao encontrado. Abortando."
  exit 1
fi

echo "Empacotando .output..."
rm -f "$PACKAGE"
tar -czf "$PACKAGE" .output

echo "Enviando pacote para o servidor..."
scp "$PACKAGE" "$SERVER:$APP_DIR/$PACKAGE"
if [ $? -ne 0 ]; then
  echo "Falha no envio. Abortando."
  exit 1
fi

echo "Aplicando bundle e reiniciando..."
ssh "$SERVER" "
  set -e
  rm -rf $APP_DIR/.output_new $APP_DIR/.output_prev
  mkdir -p $APP_DIR/.output_new
  tar -xzf $APP_DIR/$PACKAGE -C $APP_DIR/.output_new
  test -f $APP_DIR/.output_new/.output/server/chunks/_/nitro.mjs
  mv $APP_DIR/.output $APP_DIR/.output_prev
  mv $APP_DIR/.output_new/.output $APP_DIR/.output
  rm -rf $APP_DIR/.output_new $APP_DIR/$PACKAGE
  rm -rf $APP_DIR/.output/server/node_modules/better-sqlite3
  cp -r $APP_DIR/node_modules/better-sqlite3 $APP_DIR/.output/server/node_modules/
  cd $APP_DIR
  pm2 reload financas
"

rm -f "$PACKAGE"

echo ""
echo "Deploy concluido! http://137.184.195.81"
