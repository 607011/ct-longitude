@ECHO OFF
SET PATH=..\_bin\;%PATH%
ECHO Beginning rsync ...
rsync.exe --exclude node_modules --exclude zzzAttic --exclude doc --exclude raw --exclude .git* --verbose --recursive -v -z -S --chmod=ug=rwx --chmod=o=rx -e "plink -ssh -P 60022 -i 'C:/Users/ola/Documents/olau@debian.PPK'" . olau@ersatzworld.net:/var/www/ersatzworld/ct/ctlon
