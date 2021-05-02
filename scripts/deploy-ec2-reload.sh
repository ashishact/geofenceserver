sudo -s
# WHY?

PROJECT=geofenceserver

mv $PROJECT.tar.gz apps/${PROJECT^^}/$PROJECT.tar.gz
cd apps/${PROJECT^^}
# rm -rf $PROJECT
tar -xzf $PROJECT.tar.gz
cd $PROJECT

# sudo pm2 restart /home/ubuntu/pm2.config.js --only GEOFENCESERVER --env development
npm install --production

PM2NAME=${PROJECT^^}-development
pm2 reload $PM2NAME && pm2 logs $PM2NAME