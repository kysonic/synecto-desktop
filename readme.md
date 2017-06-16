Production build

1. npm run dist
2. cd ./dist/mac/Designmapp.app/Contents/Resources/app
3. npm i
4. cd ../
5. asar pack app app.asar
6. rm -rf ./app
7. cd ../../../../
8. hdiutil create -volname DesignmApp -srcfolder ./Designmapp.app/ -ov -format UDZO Designmapp.dmg
9. zip -vr designmapp.zip ./designmapp.app -x "*.DS_Store"
