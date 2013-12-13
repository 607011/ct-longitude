#!/bin/bash
fname=users.csv
pwdfile=.htpasswd

exec<$fname
while read line
do
    htpasswd -b -s $pwdfile $line ct_$line
done