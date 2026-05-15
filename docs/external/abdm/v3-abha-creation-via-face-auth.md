# ABHA Creation via Face Auth

> Source: ABDM Sandbox V3 Documentation
> File: Face_Auth_ABHA_Creation_Steps_30_07_2025_6282bda40f.pdf

# ABHA Creation via Face Auth (QR based) 

**Step 1:** Generate Transaction ID 

API https://abhasbx.abdm.gov.in/abha/api/v3/enrollment/enrol/auth/init 

Request Payload 

Response Payload 

**Step 2.** 

2.1 First approach: QR code scan 

Use the transaction ID to generate QR code using any QR generator tool or customized code. Open ABHA app and scan this QR code on ABHA App to start and complete the face capture process. 

https://phrsbx.abdm.gov.in/face-auth?txnId=10bc499f-42c1-48eb-8c02-6d00a9fd4b42 

Sample QR-Code: 

 {"scope": ["abha-enrol", "face-auth"] } 

## { 

 "txnId": "96d21b5c-22b3-484e-b936-06f3735b57d4", "message": "Transaction Id generated Successfully" } 



---

2.2 Second Approach: Intent base sharing 

This approach is applicable if you want to integrate your mobile application with ABHA App. In this case the above url will be passed directly from your application and it will directly open the ABHA app Face capture Event. 

For this ABHA package ID will be shared so that intent could be invoked. 

**Step 3:** Track the status via Capture PID API 

Endpoint: https://abhasbx.abdm.gov.in/abha/api/v3/enrollment/enrol/capturePID 

You can poll the **capturePID** API **in every 5 10** seconds interval to check the status of face capture process. 

**Request body** contains: 

**Status: PENDING** 

If the status in the response is **'PENDING** ,' it indicates that the transaction is not yet verified from ABHA App. 

## { 

 "scope": [ "abha-enrol", "face-verify" ], "txnId":"{{transactionId}}" } 



---

**Status: VERIFIED** 

If the response status is **'VERIFIED** ,' it means the transaction is verified, but face authentication has not yet been completed. 

**Status: FAILED** 

If the response status is **'FAILED** ,' it means that the face authentication process using the RD service from the ABHA app was unsuccessful due to technical issues. 

**Status: COMPLETE** 



---

If the response status is **'COMPLETE** ,' it means the face authentication process using the RD service from the ABHA app was successfully completed, and the user has been authenticated. 

Once the authentication process is successfully completed Call the Enrollment API. 

**Step 4. Aadhaar Enrollment API** 

Endpoint: https://abhasbx.abdm.gov.in/abha/api/v3/enrollment/enrol/byAadhaar 

In this API, the user must provide an encrypted Aadhaar number along with the corresponding transaction ID. The faceAuth PID will be automatically retrieved from the cache. Based on this information, the system will proceed to create a user's account. If an account already exists, the API will return an appropriate response. 



---

**Request Body:** 

## { 

 "authData": { "authMethods": [ "face_auth" ], "face": { "txnId": "881f2bf5-7377-4067-b50e-1e6ff100b3cc", "aadhaar": "{{encrypted_aadhaar_number}} "mobile": "{{mobile_number}}" } }, "consent": { "code": "abha-enrollment", "version": "1.4" } } 



---

Response Payload 

 { "message": "This account already exist", "txnId": "c236a618-a84e-48c2-a2c5-9d9606e757f9", "tokens": { "token": "{{token}}", "expiresIn": 1800, "refreshToken": "{{r-token}}", "refreshExpiresIn": 1296000 }, "ABHAProfile": { "preferredAddress": "91323*****8769@sbx", "firstName": "Kushal", "middleName": "", "lastName": "Pandita", "dob": "11-02-2000", "gender": "M", "mobile": "78898****8", "mobileVerified": true , "email": null , "phrAddress": [ "91*******769@sbx" ], "address": "", "districtCode": "5", "stateCode": "1", "pinCode": "180005", "abhaType": "STANDARD", "stateName": "JAMMU AND KASHMIR", "districtName": "JAMMU", "ABHANumber": "91-****-****-8769", "abhaStatus": "ACTIVE" }, "isNew": false } 



