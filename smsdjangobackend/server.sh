#!/bin/bash

#parameters 1. git pull 2. upload url
jsonValue() {
    KEY=$1
    awk -F"[,:}]" '{for(i=1;i<=NF;i++){if($i~/'$KEY'\042/){print $(i+1)}}}' | tr -d '"'
}
while getopts g:u:n:h:x:z:k:b: option
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
b) UPLOADBDU='uploadbdu'
esac
done

export DJANGO_SETTINGS_MODULE=sms.settings.production

set -e
DJANGO_SUPERUSER_PASSWORD=edubricz

echo $GIT
currentpath=`pwd`

cd $currentpath

if ! [ -z "$GIT" ]
then
    git pull origin staging
fi
. /var/www/html/backend/env/bin/activate

if ! [ -z "$DATBASENAME" ]
then
    temp=$DATABASEKEY
    echo $temp
    python3 tenant_manage.py $temp migrate --database=$temp;
    python3 tenant_manage.py $temp inittutorial;
    python3 tenant_manage.py $temp uploadurl;
    python3 tenant_manage.py $temp inittutorial;
    python3 tenant_manage.py $temp uploadbdu;
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
        echo $val
        temp=$(echo $val | xargs)
        if ! [ -z "$PASSWORD" ]
        then
            password=$PASSWORD
            {
                python3 tenant_manage.py $temp updateuserpassword --password $password
            } || {
                echo "By Passing Errors"
            }
        else
            python3 tenant_manage.py $temp migrate --database=$temp;
        fi
        # python3 tenant_manage.py $temp inittutorial;
        if ! [ -z "$UPLOADURL" ]
        then
            python3 tenant_manage.py $temp uploadurl;
            python3 tenant_manage.py $temp inittutorial
        fi
        if ! [ -z "$UPLOADBDU" ]
        then
            python3 tenant_manage.py $temp uploadbdu;
        fi
    done

    iIFS=$Field_Separator
fi

echo root | sudo -S service edubricz reload
