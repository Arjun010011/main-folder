#!/bin/bash

#parameters 1. git pull 2. upload url
jsonValue() {
    KEY=$1
    awk -F"[,:}]" '{for(i=1;i<=NF;i++){if($i~/'$KEY'\042/){print $(i+1)}}}' | tr -d '"'
}
while getopts g:u:n:h:x:z:k: option
do
case "${option}"
in
g) GIT='git';;
u) UPLOADURL='uploadurl';;
n) DATBASENAME="$OPTARG";;
h) HOST="$OPTARG";;
x) USER="$OPTARG";;
z) PASSWORD="$OPTARG";;
k) DATABASEKEY="$OPTARG";;
esac
done

export DJANGO_SETTINGS_MODULE=sms.settings.local

set -e


echo $GIT
currentpath=`pwd`

cd $currentpath

if ! [ -z "$GIT" ]
then
    git pull origin staging
fi
. $currentpath/../env/bin/activate

if ! [ -z "$DATBASENAME" ]
then
    temp=$DATABASEKEY
    echo $temp
    python3 tenant_manage.py $temp migrate --database=$temp;
    python3 tenant_manage.py $temp inittutorial;
    python3 tenant_manage.py $temp uploadurl;
    python3 tenant_manage.py $temp inittutorial;
else
    input=`cat ${currentpath}/apps/tenants/templates/jsons/companies.json | jsonValue database_key`
    echo $input

    DataList=$input
    #DataList="gurukulatest,delhitest,devtest,tenant"
    Field_Separator=$IFS
    # set comma as internal field separator for the string list
    IFS=' '
    for val in $DataList;
    do
        temp=$(echo $val | xargs) 
        python3 tenant_manage.py $temp migrate --database=$temp;
        python3 tenant_manage.py $temp inittutorial;
        if ! [ -z "$UPLOADURL" ]
        then
            python3 tenant_manage.py $temp uploadurl;
            python3 tenant_manage.py $temp inittutorial;
        fi
    done

    iIFS=$Field_Separator
fi

if ! [ -z "$DATBASENAME" ]
then
wget "https://testing-edubricz-com.s3.ap-south-1.amazonaws.com/static_datas/intialqueryedubricz.sql"
echo root | sudo -S mysql -h $HOST -u $USER -p$PASSWORD $DATBASENAME < "intialqueryedubricz.sql"
echo root | sudo -S rm -rf intialqueryedubricz.sql
fi
echo root | sudo -S service edubricz reload

