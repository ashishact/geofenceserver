#1 COPY FILES
PROJECT=geofenceserver
tar -czvf $PROJECT.tar.gz -s /^dist/$PROJECT/ dist/*


scp -i $PEM $PROJECT.tar.gz ubuntu@$DNS:~/$PROJECT.tar.gz

ssh -i $PEM ubuntu@$DNS < scripts/deploy-ec2-reload.sh