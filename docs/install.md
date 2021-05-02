tsc --init
npm i @types/node -D
npm install express -S && npm install @types/express -D
npm i dotenv -S && npm i @types/dotenv -D
npm i socket.io -S && npm i @types/socket.io -D
npm i body-parser -S && npm i @types/body-parser -D
npm i aws-sdk -S && npm i @types/aws-sdk -D


## TILE server Linux
curl -L  https://github.com/tidwall/tile38/releases/download/1.21.1/tile38-1.21.1-linux-amd64.tar.gz -o tile38-1.21.1-linux-amd64.tar.gz
tar xzvf tile38-1.21.1-linux-amd64.tar.gz
cd tile38-1.21.1-linux-amd64
./tile38-server



## TILE server OSX
curl -L  https://github.com/tidwall/tile38/releases/download/1.21.1/tile38-1.21.1-darwin-amd64.zip -o tile38-1.21.1-darwin-amd64.zip
unzip tile38-1.21.1-darwin-amd64.zip
cd tile38-1.21.1-darwin-amd64
./tile38-server



## Generating types for tile38
npm install -g dts-gen
dts-gen -m tile38
mv tile38.d.ts node_modules/@types/tile38.d.ts