docker run --rm -p 9000:9000 --name minio-srv \
--add-host=thumb-srv:172.20.8.203 \
--add-host=rabbit-srv:172.20.8.203 \
-v $PWD/srv/data:/data \
-v $PWD/srv/config:/root/.minio \
minio/minio server /data

