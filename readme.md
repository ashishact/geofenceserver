# Setup

### Terminal 1
Run the tile server


### Terminal 2
```bash
npm i
npm run dev
# This will start typescript in watch mode, also it will build the frontend files with parcel
```

### Terminal 3
```bash
npm start
# This will start nodemon server
```



@note: the .env file is not in the root folder. Keep it in ../.env file




# How to use

1. Create some Assets
```js
http://localhost:3000/api/v1/assets/create?data={"id":"assets1","assets":[{"id":"a","location":{"lat":1,"lng":2}},{"id":"b","location":{"lat":10,"lng":20}}]}
```


2. Create some Geofences
```js
http://localhost:3000/api/v1/geofences/create?data={"id":"geofences1","geofences":[{"id":"a","name":"A","center":{"lat":1,"lng":1},"radius":1000,"type":"circle","path":[]},{"id":"b","name":"B","center":{"lat":30,"lng":10},"radius":500,"type":"circle","path":[]}]}
```


3. Assign
```js
http://localhost:3000/api/v1/assign?data={"assetGroupId":"assets1","geofenceGroupId":"geofences1"}
```


4. Update location of an asset (This will do an within query)
```js
http://localhost:3000/api/v1/setAssetLocation?data={"assetGroupId":"assets1","assetId":"a","location":{"lat":1,"lng":1}}
```



5. Deploy

npm run build
./deploy-ec2.sh