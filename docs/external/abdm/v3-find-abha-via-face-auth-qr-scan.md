# Find ABHA via Face Auth & QR Scan

> Source: ABDM Sandbox V3 Documentation
> File: Updated_Find_ABHA_Face_QR_Scan_API_Specification_33413c606e.pdf

API Specification 

**Find ABHA using mobile (Search ABHA):** To initiate the search 

Use this API https://abhasbx.abdm.gov.in/abha/api/v3/profile/account/abha/search with scope as search-abha and mobile number in encrypted form. 

Encryption Request: Please use public key which can be retrieved from cert API for mobile encryption 

**Response:** 

**Login via Face-Auth Using QR Code:** 

1. Call the Verify by Face Auth API using the txnId obtained from the Search API     response. Note that the transaction ID is valid for 10 minutes. 



---

 Response: { "txnId": "d059e607-564b-4202-8bd6-6e45a7d9a477", "message": "Transaction Id generated Successfully" } 

2. Use the following approach: - 

 First approach: QR code scan Use the transaction ID to generate QR code using any QR generator tool or customized code. Open ABHA app and scan this QR code on ABHA App to start and complete the face capture process. https://phrsbx.abdm.gov.in/face-auth?txnId=10bc499f-42c1-48eb-8c026d00a9fd4b42 Sample QR-Code: 

 Second Approach: Intent base sharing 

 This approach is applicable if you want to integrate your mobile application with ABHA App. In this case the above url will be passed directly from your application and it will directly open the ABHA app Face capture Event. For this ABHA package ID will be shared so that intent could be invoked. 

3. Next, scan this QR code using the ABHA App by tapping the QR icon located     at the top-left corner of the login and registration screen. 

4. Proceed to complete the face scan process in the ABHA App. The app will     then submit the captured PID to the ABHA service. 



---

5. Next, call the API below to retrieve the PID submitted from the ABHA App in     the previous step:     https://abhasbx.abdm.gov.in/abha/api/v3/enrollment/enrol/capturePID 

 You can poll the capturePID API in every 5 10 seconds interval to check the status of face capture process. Request body contains: 

 Status: PENDING If the status in the response is 'PENDING ,' it indicates that the transaction is not yet verified from ABHA App. 

 Status: VERIFIED If the response status is 'VERIFIED ,' it means the transaction is verified, but face authentication has not yet been completed. 



---

**Status: FAILED** If the response status is 'FAILED,' it means that the face authentication process using the RD service from the ABHA app was unsuccessful due to technical issues. **Status: COMPLETE** If the response status is **'COMPLETE** ,' it means the face authentication process using the RD service from the ABHA app was successfully completed, and the user has been authenticated. 



---

6. Call the login verify face Auth API to get the details of the user:- 

 Request Body:



---

This feature was recently made live on the ABHA portal. You can refer to the SBX portal for one possible implementation approach. Below is the workflow from the portal for your reference. 

**Home –** Click on Find ABHA using mobile number link 

**Find ABHA -** Provide mobile number of ABHA holder, captcha answer and click on Next 

**Select ABHA –** Select 'ABHA' to log in, then choose the 'Face Authentication' option from the dropdown. 



---

**QR Code Screen –** Click the 'Generate QR Code' button to obtain the transaction ID—this action triggers the Request OTP API. Please review the 'Prerequisites' and 'Steps to Follow' sections for the necessary actions to be performed on a mobile or tablet device. 

**QR Code Generated –** A QR code is generated, and the app also supports uploading images from the gallery. Additionally, a download option is available on the portal for this purpose. 



---

**Polling for PID Capture Event** 

**Face Captured and Submitted by App –** Once face captured and PID is submitted by App, capture PID API will respond with status as COMPLETE along with PID data. 



---

**Successful Login** 



