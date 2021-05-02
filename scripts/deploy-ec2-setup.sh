# Ubuntu

sudo apt update

# Node
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginx
sudo apt -y install nginx
# into /etc/nginx/sites-available/default
`location / {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host      $http_host;

        proxy_pass http://localhost:3001;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
}`
sudo service nginx restart


# install pm2
sudo npm install pm2 -g


mkdir -p LOGGER
cd LOGGER
nano .env

# COPY the files to LOGGER/logger
# THEN ..

cd logger
npm install --production
pm2 start server.js --time --name "LOGGER"

