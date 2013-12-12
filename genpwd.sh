#!/bin/bash
fname=users.csv
pwdfile=.htpasswd

exec<$fname
while read line
do
    htpasswd -b -s $pwdfile $line $line
done