(^)

# Integrator Guide

## ABDM ABHA V3 APIs

## Version 1.


##### Version History:

Version Release Date Created By Reviewed by Approved by Nature of changes

1.0 07 - 08 - (^2024) Priyanka
Varude
Prasad Vishwanath Sachin Yadav Document Approved

###### 1.1 19 - 09 - 2024

```
Priyanka
Varude
```
Prasad Vishwanath Nitesh Jain (^) Updated document
with QR code API
details
1.2 04 - 10 - (^2024) Priyanka
Varude
Prasad Vishwanath Nitesh Jain (^) Updated Password
Uses Cases
1.3 16 - 12 - (^2024) Nilam
Barve
Priyanka Varude Nitesh Jain
Biometric Login APIs
and Forgot ABHA

###### 1.4 28 - 01 - 2025

```
Kushal
Pandita
```
```
Priyanka Varude Nitesh Jain Find ABHA via
Biometric, ABHA
address Verification
via Biometric
```
#### Table Of Contents

##### ABHA APIs ............................................................................................................................................. 7

##### 1.0 Generate session token ..................................................................................................................... 7

##### 2.0 Encrypt data (Aadhaar/Mobile/OTP/Password) .......................................................................... 8

##### 3.0 ABHA Creation via Aadhaar ........................................................................................................... 9

##### Step 1: Login via Aadhaar OTP ........................................................................................................ 9

##### Step 2: Resend Aadhaar OTP .......................................................................................................... 11

##### Step 3: Enrol ABHA ......................................................................................................................... 12

##### Step 4: ABHA Mobile Verification .................................................................................................. 22





   - Step 5: Email Verification
   - Step 6: ABHA Suggestions and ABHA Address creation
- 4.0 ABHA Creation via Driving License.............................................................................................
- 5.0 ABHA Creation via Demo Auth
- 6.0 ABHA Creation via Biometrics
      - 6.2.1 Create ABHA via FingerPrint
      - 6.2.2 Create ABHA via FaceAuth
      - 6.2.3 Create ABHA via IrisAuth
- 7.0 ABHA verification
   - 7.1 Login via Aadhaar OTP
   - 7.2 Login via Aadhaar Number
   - 7.3 Login via Abha OTP
   - 7.4 Login via Mobile OTP
   - 7.5 Login via Biometric
      - 7.5.1 Login via FaceAuth
      - 7.5.2 Login via FingerprintAuth
      - 7.5.3 Login via IrisAuth
- 7.6 Find ABHA
      - 7.6.1 Search ABHA using Mobile
      - 7.6.1.1 Search ABHA
      - 7.6.1.2 Generate OTP
      - 7.6.1.3 Verify OTP
      - 7.6.2 Search ABHA using Aadhaar
      - 7.6.2.1 Search ABHA
      - 7.6.2.2 Generate OTP
      - 7.6.2.3 Verify OTP
      - 7.6.3 Search ABHA using Biometrics
      - 7.6.3.1 Search ABHA using Biometric ( Face )
      - 7.6.3.1.1 Search ABHA
      - 7.6.3.1.2 Generate OTP
      - 7.6.3.1.3 Verify OTP
      - 7.6.3.2 Search ABHA using Biometric ( Fingerprint )
      - 7.6.3.2.1 Search ABHA
      - 7.6.3.2.2 Generate OTP
      - 7.6.3.2.3 Verify OTP
      - 7.6.3.3 Search ABHA using Biometric (IRIS)
      - 7.6.3.3.1 Search ABHA
      - 7.6.3.3.2 Generate OTP
      - 7.6.3.3.3 Verify OTP
- 8.0 Update Profile
   - 8.1 Update Mobile
   - 8.2 Update Email
   - 8.3 Delete/Deactivate ABHA Number
      - 8.3.1 Delete ABHA Via Aadhaar
      - 8.3.2 Delete ABHA Via ABHA OTP
      - 8.3.3 Delete ABHA Via Password
   - 8.4 Deactivate ABHA Number
      - 8.4.1 Deactivate ABHA Via Aadhaar
      - 8.4.2 Deactivate ABHA Via ABHA OTP
      - 8.4.3 Deactivate ABHA Via Password.................................................................................................
   - 8.5 Re-activate ABHA Number
   - 8.6 Re-KYC
- 9.0 Get Profile
- 10.0 Generate QR Code
- 11.0 Generate ABHA Card
- 12.0 Forgot ABHA number
   - 12.1 Recover via Aadhaar OTP
   - 12.2 Recover via Mobile OTP
- 13.0 Benefit API’s
   - 13.1 Create ABHA using Aadhaar
   - Step 2: Enrol ABHA
   - 13.2 Create ABHA via Biometric
      - 13.2.1 Create ABHA via FingerPrint
      - 13.2.2 Create ABHA via FaceAuth
      - 13.2.3 Create ABHA via IrisAuth
   - 13.3 Link OR Delink ABHA With Benefit Name
      - 13.3.1 Link ABHA With Benefit Name
      - 13.3.2 De-link ABHA With Benefit Name
   - 13.4 Update ABHA Profile Details
      - 13.4.1 Update Mobile
      - 13.4.2 Update Profile........................................................................................................................
      - 13.4.3 Update Profile........................................................................................................................
   - 13.5 Search Benefit Details
      - 13.5.1 Search by Aadhaar
      - 13.5.2 Search by Health Id Number
      - 13.5.3 Search
- 13.6 Find ABHA (For Govt Entity)
      - 13.6.1 Search ABHA using Mobile
      - 13.6.1.1 Search ABHA
      - 13.6.1.2 Generate OTP
      - 13.6.1.3 Verify OTP
      - 13.6.2 Search ABHA using Aadhaar
      - 13.6.2.1 Search ABHA
      - 13.6.2.2 Generate OTP
      - 13.6.2.3 Verify OTP
      - 13.6.3 Search ABHA using Biometrics
      - 13.6.3.1 Search ABHA using Biometric ( Face )
         - 13.6.3.1.1 Search ABHA
         - 13.6.3.1.2 Generate OTP
         - 13.6.3.1.3 Verify OTP
         - 13.6.3.2 Search ABHA using Biometric ( Fingerprint )
         - 13.6.3.2.1 Search ABHA
         - 13.6.3.2.2 Generate OTP
         - 13.6.3.2.3 Verify OTP
         - 13.6.3.3 Search ABHA using Biometric (IRIS)
         - 13.6.3.3.1 Search ABHA
         - 13.6.3.3.2 Generate OTP
         - 13.6.3.3.3 Verify OTP
   - 13.7 Child ABHA (These APIs are intended for use only by specific Government
   - integrators, approved by NHA).....................................................................................................
         - 13.7.1 Create ABHA
         - 13.7.2 Get Child ABHA
         - 13.7.3 Update Child ABHA
- 14.0 ABHA Address Verification
- 14.1 ABHA Address Verification via Mobile OTP
- 14.2 ABHA Address Verification via Aadhaar OTP
- 14.3 ABHA Address Verification via Biometric
         - 14.3.1 ABHA Address Verification via Biometric (Face)
         - 14.3.2 ABHA Address Verification via Biometric (Fingerprint)
         - 14.3.3 ABHA Address Verification via Biometric (Iris)
- 14.4 Profile
      - 14.4.1 Get ABHA address ABHA Profile
      - 14.4.2 Get ABHA address ABHA card
      - 14.4.3 Get QR Code


**ABHA APIs**

##### Environment URLs {{base_url}} :

### SBX: https://abhasbx.abdm.gov.in/abha/api

##### Prod: https://abha.abdm.gov.in/api/abha

```
Note : Base URLs for ABHA Address verification (applicable to section 12 of this document only):
```
```
SBX: https://abhasbx.abdm.gov.in/abha/api/v3/phr/web
```
```
PROD: https://phr.abdm.gov.in/api/phr/web/v 3
```
```
1.0 Generate session token
```
##### This API generates Session token using client_id and client_secret.

##### V3 Session:

##### Sandbox Session URL https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions

##### Production Session URL https://apis.abdm.gov.in/api/hiecm/gateway/v3/sessions

##### Method: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-CM-ID {{X_CM_ID)) Yes This value depends on the environment
where API is getting executed. Eg. SBX or
PROD.
For SBX- sbx and for PROD- abdm
```
##### Request Body:


```
Request Body^
```
###### {

```
"clientId": "{{ClientId}}",
"clientSecret": "{{ClientSecret}}",
"grantType": "client_credentials"
}
```
**Response:**

```
Response^
```
Code: 200 OK (^)
{
"accessToken":
"eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJBbFJiNVdDbThUbTlFSl9JZk85ejA2a
jlvQ3Y1MXBLS0ZrbkdiX1RCdkswIn0..hmJ4tmAbpRd8tPMmzZTdQvzGhxE7rQcDJEow2MrL3W1MhSeZk_
CEjGYyHh7NDgFzzfT39oQiUAYf06buXi1KWX8xptkrQk1uitgNecqw8Lel5wufs2Z8dFawsYJtmVHPP_2r
DqvUhSeTADGYBp-84tXkpslgp2tjkjsdOOkQsZtpJLaV_vHkkLi7QRncl2KG2IfHDS8yebcpqi-
MMGYcDmyb42Po5xmQ9Lzw6IwgJzUJsFxKbIQ22m3MaYqXYt4ZOPfxYcunr7ppMhNldJVE55_CMuY-
NfWrbaTkc6iLA-y0PCQ-yvyu9l1pN2iwyJbtMotEtV065Uqek0oQ0py2Mw",
"expiresIn": 1200 ,
"refreshExpiresIn": 1800 ,
"refreshToken":
"eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIyMWU5NzA4OS00ZTcxLTQyNGEtOTAzY
S1jOTAyMWM1NmFlNWYifQ.eyJleHAiOjE3MTA0MDM1NjIsImlhdCI6MTcxMDQwMTc2MiwianRpIjoiZTQ
NDgzYzctZDFmYy00ZDg5LTkyNzctOTUxY2I0MDNhYzUwIiwiaXNzIjoiaHR0cHM6Ly9kZXYubmRobS5nb
YuaW4vYXV0aC9yZWFsbXMvY2VudHJhbC1yZWdpc3RyeSIsImF1ZCI6Imh0dHBzOi8vZGV2Lm5kaG0uZ
LmluL2F1dGgvcmVhbG1zL2NlbnRyYWwtcmVnaXN0cnkiLCJzdWIiOiIwNmJkNGZlNy04NjEyLTRiZmEtYT
I1NS1iMDdiZmFjZmU1M2QiLCJ0eXAiOiJSZWZyZXNoIiwiYXpwIjoiaGVhbHRoaWQtYXBpIiwic2Vzc2lv
bl9zdGF0ZSI6IjBiNDljZDBjLWQ0OWQtNDA0Yi1hZWY3LWRlZGY3NDRlNTA1ZCIsInNjb3BlIjoib3Blbm
lkIGVtYWlsIHByb2ZpbGUifQ.NAMWFGbIqmGHaWa__9WnJPvgIyZdCAE9AwxYUz5UrM",
"tokenType": "bearer"
}
2.0 Encrypt data (Aadhaar/Mobile/OTP/Password)
**Step 1 :** To encrypt any data( Aadhaar/Mobile/OTP/Password etc) public key can be generated using
below API
**URL:** https://abhasbx.abdm.gov.in/abha/api/v3/profile/public/certificate
**Request:** GET
Request Body


```
Response
{
"publicKey":
"MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAstWB95C5pHLXiYW59qyO4Xb+59KYVm9Hywbo77qETZVAyc6VIsxU+UWhd/k/Yt
jZibCznB+HaXWX9TVTFs9Nwgv7LRGq5uLczpZQDrU7dnGkl/urRA8p0Jv/f8T0MZdFWQgks91uFffeBmJOb58u68ZRxSYGMPe4hb9XXKDVsg
oSJaRNYviH7RgAI2QhTCwLEiMqIaUX3p1SAc178ZlN8qHXSSGXvhDR1GKM+y2DIyJqlzfik7lD14mDY/I4lcbftib8cv7llkybtjX1AayfZp4XpmIXK
Wv8nRM488/jOAF81Bi13paKgpjQUUuwq9tb5Qd/DChytYgBTBTJFe7irDFCmTIcqPr8+IMB7tXA3YXPp3z605Z6cGoYxezUm2Nz2o6oUmarD
UntDhq/PnkNergmSeSvS8gD9DHBuJkJWZweG3xOPXiKQAUBr92mdFhJGm6fitO5jsBxgpmulxpG0oKDy9lAOLWSqK92JMcbMNHn4wRikdI
9HSiXrrI7fLhJYTbyU3I4v5ESdEsayHXuiwO/1C8y56egzKSw44GAtEpbAkTNEEfK5H5R0QnVBIXOvfeF4tzGvmkfOO6nNXU3o/WAdOyV3xSQ
9dqLY5MEL4sJCGY1iJBIAQ452s8v0ynJG5Yq+8hNhsCVnklCzAlsIzQpnSVDUVEzv17grVAw078CAwEAAQ==",
"encryptionAlgorithm": "RSA/ECB/OAEPWithSHA-1AndMGF1Padding"
}
```
```
Step 2 : once public key is generated data can be encrypted using below third party API
“https://www.devglan.com/online-tools/rsa-encrypt”
```
```
Step 3: Select Cipher type as RSA/ECB/OAEPWithSHA-1AndMGF1Padding
```
```
3.0 ABHA Creation via Aadhaar
```
##### Create via Aadhaar OTP

**Step 1: Login via Aadhaar OTP**

```
This API accepts encrypted Aadhaar Number and then Generates OTP for Aadhaar linked mobile number.
```
##### V3 URL: {{base_url}}/v3/enrollment/request/otp

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters:**

Property Name Value (^) Mandatory Description
txnId Empty No Transaction Id is Mandatory to identify the unique
transaction for ABHA enrolment. This chains all the steps to
enrol in ABHA. Transaction Id will be returned after a
successful OTP transaction.
Scope abha-
enrol
Yes Defines the scope of the current action of the API,
following are the values that can be used.
ABHA_ENROL("abha-enrol"),
DL_FLOW("dl-flow"),
MOBILE_VERIFY("mobile-verify"),
EMAIL_VERIFY("email-verify"),
loginHint aadhaar Yes Type of login
loginId Encrypted
Aadhaar
number
Yes Actual value of login type. This needs to be RSA encrypted
using a public key
otpSystem aadhaar Yes OTP system to verify hiu/hip/phr login, following are the
values that can be used.
AADHAAR("aadhaar"),
ABDM("abdm"),
**V3 Request Body:**
Request Body^
{
"txnId": "",
"scope": [
"abha-enrol"
],
"loginHint": "aadhaar",
"loginId": " _{{Aadhaar_encrypted_Output}}_ ",
"otpSystem": "aadhaar"
}


```
V3 Response:
```
Response (^)
Code: 200 OK
{
"txnId": "1234567890:20211216223812",
"message": "OTP is sent to Aadhaar registered mobile ending xxx001"
}
**Step 2: Resend Aadhaar OTP**
This API resends Aadhaar OTP
**V3 URL** : {{base_url}}/v3/enrollment/request/otp

##### V3 Request : POST

```
V3 Request Headers:
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a
```
```
Yes Unique UUID for tracking the
end-to-end request transaction
```
```
TIMESTAMP {{$isoTimestamp}}
Yes The actual time when the
request was initiated, ISO 8601
represents the date and time by
starting with the year, followed
by the month, the day, the hour,
the minutes, seconds, and
milliseconds
```
```
Authorization {{accesstoken}} Yes Token generated from session
API
```
```
V3 Body Parameters:
```
Property Name Value (^) Mandatory Description
txnId Empty No Transaction Id is Mandatory to identify the unique
transaction for ABHA enrolment. This chains all the steps to
enrol in ABHA. Transaction Id will be returned after a
successful OTP transaction.
Scope abha-
enrol
Yes Defines the scope of the current action of the API,
following are the values that can be used.
ABHA_ENROL("abha-enrol"),
DL_FLOW("dl-flow"),
MOBILE_VERIFY("mobile-verify"),
EMAIL_VERIFY("email-verify"),


```
loginHint aadhaar Yes Type of login
loginId Encrypted
Aadhaar
number
```
```
Yes Actual value of login type. This needs to be RSA encrypted
using a public key
```
```
otpSystem aadhaar Yes OTP system to verify hiu/hip/phr login, following are the
values that can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
```
Request Body^

```
{
"scope": [
"abha-enrol"
],
"loginHint": "aadhaar",
"loginId": "{{AadhaarencryptedOutput}}",
"otpSystem": "aadhaar"
}
```
```
V3 Response:
Response
```
```
Code: 200 OK
{
"txnId": "0658241c-1ad1- 4703 - 8fc2-512a5fb8754b",
"message": "OTP sent to Aadhaar registered mobile number ending with ******5852"
}
```
**Step 3: Enrol ABHA**

```
API accepts transaction ID (previous step response) and encrypted OTP along with a primary mobile
number for ABHA.
```
```
V3 URL: {{base_url}}/v3/enrollment/enrol/byAadhaar
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
```
```
authData Empty Yes Transaction Id is Mandatory to identify the unique transaction for ABHA enrolment. This chains all the steps to enrol in ABHA.
Transaction Id will be returned after a successful OTP transaction.
```
```
authMethods Otp Yes Defines the authentication method used for enrolment, following are
the values that can be used.
```
```
OTP("otp"),
PI("pi"),
```
timeStamp Actual time, format :
"YYYY-
MM-DD HH:mm:ss"

```
Yes The actual time when the request was initiated, ISO 8601 represents the
date and time by starting with the year, followed by the month, the day,
the hour, the minutes, seconds, and milliseconds
```
txnId Actual
Transaction Id

```
Yes Transaction Id received as a response to request/mobileOrEmailOTP API
```
otpValue Encrypted OTP value Yes (^)
Mobile Primary Mobile number Yes If the user wants to use a mobile number which is other than the mobile
number which is linked with the Aadhaar number
Consent - Yes (^)
Code abha-enrollment Yes Consent code for creating AHBA number
Version 1.4 Yes Consent version for creating ABHA number
**Note: mobile parameter in the below request is referred to as the primary mobile number V3 Request
Body:**
Request Body


###### {

```
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": "{{lastResponseTxnId}}",
"otpValue": "{{OTP_encryption}}",
"mobile": "{{mobile_number}}"
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
}
}
```
##### V3 Response

a) If the primary mobile number matches with Aadhaar linked mobile number.
Response
Code: 200 OK


###### {

"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTn
VtYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW
5zYWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1Mj
YzNzE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG
0C5eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DD
JgtxAtP6Gem5jy-
82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXm-EIZhhwV3TXfhCg6lgnbg-YXN6668oAoGCg8G5tljjim6-
5yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosYDHphVXNPnHo
eXvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTj
t2MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXs
cQqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Priyanka",
"middleName": "Sudhir",
"lastName": "Varude",
"dob": " 26 - 11 - 1989 ",
"mobile":"******1670"
"gender": "F",
"photo": "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


```
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
FMBvenUUUAf//Z",
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": " 27 ",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}
```
```
b) If the primary mobile number is different from Aadhaar linked mobile number.
```
```
Response
```
```
Code : 200 OK
```
{
"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTnV
tYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW5z
YWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1MjYzN
zE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG0C
eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DDJ
gtxAtP6Gem5jy-82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXmEIZhhwV3TXfhCg6lgnbg-
YXN6668oAoGCg8G5tljjim65yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrV
geosYDHphVXNPnHoe XvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,


"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC
1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTjt
MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXsc



QqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5K
R5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Priyanka",
"middleName": "Sudhir",
"lastName": "Varude",
"dob": " 26 - 11 - 1989 ",
"gender": "F",
"photo": "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",
"mobile": null,



"email": null,
"phrAddress": [


"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": "27",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}

```
Note: If the primary mobile number matches with Aadhaar linked mobile number then mobile is
saved in DB and if the primary mobile number is different from Aadhaar linked mobile number
then mobile is not saved and its value is null.
```
```
Step 4: ABHA Mobile Verification
a. Send OTP
This API generates OTP for mobile verification (Mobile number not liked with Aadhaar).
```
```
V3 URL: {{base_url}}/v3/enrollment/request/otp
```
```
V3 Request : POST
```
```
V3 Request Headers:
```
```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session api
```
```
V3 Body Parameters:
```
Property Name Value (^) Mandatory Description
txnId Actual^
Transaction Id
Yes Transaction Id received as a response to
/enrollment/enrol/byAadhaarAPI


```
Scope abha- enrol
mobile- verify
```
```
Yes Defines the scope of the current action of the API, following
are the values that can be used.
```
```
ABHA_ENROL("abha-enrol"),
DL_FLOW("dl-flow"),
MOBILE_VERIFY("mobile-verify"),
EMAIL_VERIFY("email-verify"),
```
loginHint mobile Yes (^)
loginId Encrypted
Mobile
number
Yes (^)
otpSystem abdm Yes OTP system to verify hiu/hip/phr login, following are the
values that can be used.
AADHAAR("aadhaar"),
ABDM("abdm"),
**V3 Request Body:**
Request Body
{
"txnId": "{{txnId}}",
"scope": [
"abha-enrol",
"mobile-verify"
],
"loginHint": "mobile",
"loginId":
"oEIWeeEnSg4tzWQQ8iPedMACyd/+6pfmdPsnwADBwaj26wWM0emiAHZRVMV0Ir8W21oa6ai22CxY2XatoT8DhWnQEIU/
g86QaPsqolr/ksMaSBsKSe0TlPwPasB1RwCmfstelj+Zg0yNplvD/sYqyBFvSLHka7FSqk4/Djp4PK3PCji6He8y3mZXy7rNYBBbo7
9VszQkgpoiQCzaynZzzW2iEwEmpGmZ0yJz0L9ynjQh/sVvzpIjPz5BUiCnn5Qw5nrPIzR764VcBP15MGjdFIeNrDn/m1WGaYlQg
7c+AGeIcJ/3XRjojVqR722xB0aicJa631Qy3ClQyoX4hJgMv1vgLfdRHB4AsvnbofZmHngnCuYnBah44tcISZTOyET3nqP6Y/zPHh
mPh4CoMu0DAIi3dBKKj96SHWVd44JostStCq6hUDKDrNuzNPzdeQPGFcu+B24LuvflKglQR4DGyhwCH6Jr17Atvk/vAi7fxCPpX
PLxPoXj9JRJmsp3Gfe3MjtSddpZbGNG24ds47ijhcyusdchwuXzxRq6nW/iJ4k09qj8WQO1KG7a4b7SLx7OCPoQqiZQFZzV+wGf
FrNbqZtZ1toAKGKNu7HS5iY5RACYwUFfhZvbpu/hUNblsda+zxKzJ3O3zOAjYMie4SBD0W+ZaNem8hQao3brsE5WqxqeyHGxE
iDPpA=",
"otpSystem": "abdm"
}
**V3 Response:**
Response
{
"txnId": "3ec0e997-fd1b-47cd-b0f5-60199d334e73",
"message": "OTP sent to mobile number ending with ******3372"
}
**b. Verify OTP**


This API verifies via Mobile OTP.

##### V3 URL: {{base_url}}/v3/enrollment/auth/byAbdm V3 Request : POST V3

**Request Headers** :
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

```
Yes Unique UUID for tracking the endto-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session api
```
**V3 Body Parameters:**
Property Name Example Value Mandatory Description

```
authData Empty Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA enrolment. This chains all the steps to enrol in ABHA.
Transaction Id will be returned after a successful OTP transaction.
```
```
authMethods Otp Yes Defines the authentication method used for enrolment, following are
the values that can be used.
```
```
OTP("otp"),
PI("pi"),
```
```
timeStamp Actual time, format :
"YYYY-
MM-DD HH:mm:ss"
```
```
Yes The actual time when the request was initiated, ISO 8601 represents
the date and time by starting with the year, followed by the month,
the day, the hour, the minutes, seconds, and milliseconds
```
```
txnId Actual
Transaction Id
```
```
Yes Transaction Id received as a response to request/mobileOrEmailOTP
API
```
otpValue Encrypted OTP value Yes (^)
**V3 Request Body:**
Request Body


###### {

```
"scope": [
"abha-enrol",
"mobile-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"timeStamp": "{{current_timestamp}}",
"txnId": "{{txnId}}", "otpValue":
"WyJtOAFEe5hyS5gizaNxl3rGNaHqe6cO8Ada+gFBKm0PjWLeVpEIh1hsd8GzP2GIvyB6flEstF1aUjqYi9B275EWdpqqTchVn13
X0zl94SBnEFR6VcdJ35OQaey1JAdldcVAvAQbbb7M2ih+mLuQ3Y3UsHynt4cUcH5L76Wilk4s2zfB9GZ7PpRPWFJWGJat9LdAs
wX1H41Ce7PP3Fqp/hs3yhZkEYF25VeESBZyYQnuCNtdoy+S+D+dPcYBJKB7EhwE+o+18F7tcS+Cqj20LQRHGNLWE39A1nXNxc
kEVdUcoZJA8+otLNFvjINrSS0YHu0uvd2UxsCkj1HfM6SLkQzu4QEdllkKB10AtpGFaAbAk4NiKyAJSQsneLRsV66fDE7D7RZjJVIrs
awxJeqfrTr4xryR+NCEl+90o74T2Im3K/lFxYuMLnUZa66pIM0/9NRkk772p9142/F43pY/ntWle8UoZGODUNQySRJuhOhK8JW
ExZxdocwgwJI7fo9d3SFQ3gIHfsDswtkyDxWLikrVSWvAnaqoBCKa+WIrXx+Ey76ZtPxGjURZ0OtIdMUFhK31X6SzFwIkzOIQUm
3cAaLeJaLYd0hg+QewbDP6k1nWzZiAap2jpkfUnLunJVRfeSyzRE6tEgvvdqT/jUI62S3ApJUrLQQgFAPp3VjUU84="
}
}
}
```
```
V3 Response:
Response
{
"txnId": "366c8f41-4ef8-49ee-b73a-2e3e44613086",
"authResult": "success",
"message": "OTP verified successfully"
}
```
### Step 5: Email Verification

```
V3 URL: {{base_url}}/v3/profile/account/request/emailVerificationLink
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-profile
emaillinkverify
```
```
Yes Defines the scope of the current action of the
API, following are the values that can be used.
abha-profile email-linkverify
```
```
loginHint email Yes Type of login
```
```
loginId Encrypted
email idr
```
```
Yes Actual value of login type. This needs to be RSA
encrypted using a public key
```
```
otpSystem abdm Yes Otp system to verify hiu/hip/phr login, following are the
values that can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
**V3 Request Body:**

```
Request Body
{
"scope": [
"abha-profile",
"email-link-verify"
],
"loginHint": "email",
"loginId":
"pb2Rf4GQ3zq5rIxXWgpn8Td9HMh0sjlb/SbN+6CHpylD422FxcJPHgo9Zyc3SES5etu60JFga4729tdi4BPU0mW053M6d2kC3E
W8cd917VNP0hett79+S80JG6VdWYsb3pzF3G7GoGaCEqcmr6pt5ZX2NNkN9YT5f9QXqSUkrNAm9/RJVUzUy+KuXo0MbV35
nOU6IO5Bs8Bly+Ggs96kogiTf8iajIxheoO02nVU1Ln6Q9rjgLFI1ibyEJ5/wvOp8FvSA3Ed8+CodQpkWeiJbRFokZCMHx9ONlIO8
Zbr0brbCGQsZkfqOjRZswgS8vV3lJded1Vx7qY3bqb/QWZSYLWgXN61TFU4EZ/vq1jix0YasIuuxjijWUzTV43qDL/AJPKLnsOhGis
1G+quo7WKzTCAAEkjbEEApZNrZL5RYcn3gykXfbNJaSu82tHO4Bke9uXc6ON91QcAhNHeOJFc3zPvftCQu59YYunuiaM3YmX
MCeVtaOYyaO1mLd+OEDCrWTeEyPZCkRf32W0TXjhoTN7UcC+t94hWWv2dAahbVzpMiS+NXVoAMj66/l/7wbUqsem/aK+3j
/tveftXJTyREg7/wjHWBrjUdt8hMFsbinsYs+S7Bpus65Oafqrost5MDdxlu+0g8C3ce0EUDF76sklA1S885gN3KMsqk5cC9hY=",
"otpSystem": "abdm"
}
```

```
V3 Response:
Response
Code: 200
```
```
No Response
```
### Step 6: ABHA Suggestions and ABHA Address creation

##### a) Get ABHA Address Suggestion

##### This API returns ABHA address suggestion.

```
V3 URL: {{base_url}}/v3/enrollment/enrol/suggestion
```
##### V3 Request: GET

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
Transaction_Id 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Transaction Id is
Mandatory to
identify the unique
transaction for
ABHA enrollment.
This chains all the
steps to enroll in
ABHA.
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for
tracking the
endtoend request
transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time
when the request
was initiated, ISO
8601 represents the
date and time by
starting with the
year, followed by the
month, the day, the
hour, the minutes,
seconds, and
milliseconds
Authorization {{accesstoken}} Yes Token generated
from session API
```
##### V3 Body parameters: NA


```
V3 Request body: NA
```
```
V3 Response:
Response^
```
**Code: 200 OK** (^)
{
"txnId": "daa3ec62-60b2-4d06-8dc0-16e38c38d102",
"abhaAddressList": [
"anchalsing1",
"anchal1995",
"anchal.singh",
"anchal299",
"singh299"
] }

### b) Create Custom ABHA Address.

```
API is used to create Custom ABHA Address against that transaction ID.
```
```
V3 URL: {{base_url}}/v3/enrollment/enrol/abha-address
```
```
V3 Request: POST
```
```
V3 Request Headers:
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
end-to-end request transaction
```
```
TIMESTAMP {{$isoTimestamp}}
Yes The actual time when the
request was initiated, ISO 8601
represents the date and time by
starting with the year, followed
by the month, the day, the hour,
the minutes, seconds, and
milliseconds
```
```
Authorization {{accesstoken}} Yes Token generated from session
API
```
```
V3 Body parameters:
Property Name Value Mandatory Description
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction
for ABHA enrollment. This chains all the steps to enroll in ABHA.
Transaction Id will be returned after successful ABHA Address
creation
```

```
abhaAddress String Yes Custom ABHA Address that the user wants to create
```
```
Preferred Number Yes The accepted value is “1” which is used for setting the ABHA
Address as the Preferred one.
```
```
V3 Request Body:
```
Request Body^

{
"txnId":"e4a7ebfa-18c5-481f-acd2-a6dc1165ae46",
"abhaAddress":"gaurav_22101991",
"preferred": 1 }

```
V3 Response:
Response^
```
Code: 200 OK (^)
{
"txnId": "e4a7ebfa-18c5-481f-acd2-a6dc1165ae46",
"healthIdNumber": "91- 6285 - 4575 - XXXX",
"preferredAbhaAddress": "gaurav_22101991"
}

## 4.0 ABHA Creation via Driving License.............................................................................................

```
Step 1: Generate OTP
```
##### This is an API that will be invoked to send OTP to a given encrypted mobile number and create

##### transaction id.

```
V3 URL: {{base_url}}/v3/enrollment/request/otp
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
```

```
Authorization Token {{accesstoken}} Yes Token generated from session api
```
##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
scope abha-enrol mobileverify
dl-flow
```
```
Yes Defines the scope of the current action of the
API
```
```
loginHint “mobile” Yes Type of login
loginId Encrypted mobile number Yes Actual value of login type. This needs to be RSA
encrypted using a Public key
```
```
otpSystem “abdm” Yes OTP system to verify hiu/hip/phr login
```
```
V3 Request Body:
```
Request body^

```
{
"scope": [
"abha-enrol",
"mobile-verify",
"dl-flow"
],
"loginHint": “mobile”,
"loginId”: "{{Mobile_Encryption}}",
"otpSystem": ”abdm”
}
```
```
V3 Response:
Response
```
```
Code: 200 OK
```
```
{
"txnId": "34935c59-f57e- 4304 - a318-3aa0b146c426",
"message": "OTP is sent to Aadhaar registered mobile ending *******3603"
}
```
```
Step 2: Verify Mobile OTP
```
```
This API will verify mobile OTP and update details in the transaction table.
```
##### V3 URL: {{base_url}}/v3/enrollment/auth/byAbdm

##### V3 Request: POST

##### V3 Request Headers:


```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end- to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
scope abha-enrol mobileverify
dl-flow
```
```
Yes Defines the scope of the current action of the API
```
```
authMethods “otp” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
```
```
timeStamp Actual time, format :
"YYYY-MM-DD HH:mm:ss"
```
```
Yes The actual time when the request was initiated,
ISO 8601 represents the date and time by starting
with the year, followed by the month, the day,
the hour, the minutes, seconds, and milliseconds
```
```
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrollment.
This chains all the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
otpValue Encrypted OTP value
```
Yes (^)
**V3 Request Body:**
Request Body^


###### {

"scope": [
"abha-enrol",
"mobile-verify",
"dl-flow"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"timeStamp": " _{{$timestamp}}_ ",
"txnId": " _{{lastResponseTxnId}}_ ",
"otpValue": " _{{OTP_encryption}}_ "
}
} }

```
V3 Response:
Response^
```
Code: 200 OK (^)
{
"txnId": "649ce755-810e-4f05-a9e6-022741acc42d",
"authResult": "success",
"message": "OTP verified successfully." }
**Step 3: Verify DL documents**
This is an API to validate the driving license document with NEPIX and create a new account and
generate an enrolment number.
**V3 URL:** {{base_url}}/v3/enrollment/enrol/byDocument

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```

##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrollment. This
chains all the steps to enroll in ABHA.
Transaction Id will be returned after a successful
OTP transaction.
```
documentType “DRIVING_LICENCE” Yes (^)
documentId MH1320140019054 Yes Driving license number
frontSidePhoto BASE 64 ENCODED JPEG Yes (^)
backSidePhoto BASE 64 ENCODED JPEG Yes (^)
Dob Yyyy-mm-dd Yes Date of Birth
Consent {
"code":
"abhaenrollment",
"version": "1.4" }
Yes Consent code and consent version

##### V3 Request Body:

Request Body^

```
{
"txnId": " {{lastResponseTxnId}} ",
"documentType": "DRIVING_LICENCE",
"documentId": "MH1320140019054",
"firstName": "anand",
"middleName": "vyankatesh",
"lastName": "sunchu",
"dob": "1996- 07 - 15",
"gender": "M",
"frontSidePhoto": "{{BASE 64 ENCODED JPEG}}",
"backSidePhoto": "{{BASE 64 ENCODED JPEG}} “,
"address": "russia",
"state": "maharashtra",
"district": "pune",
"pinCode": "413005",
"consent": {
"code": "abha-enrollment",
"version": "1.4"
} }
```

##### V3 Response:

```
Response^
```
Code: 200 OK (^)
{
"EnrolProfile": {
"enrolmentNumber": " 91 - 6087 - 5423 - XXXX",
"enrolmentState": "VERIFIED",
"firstName": "anand",
"middleName": "V",
"lastName": "sunchu",
"dob": " 1996 - 7 - 15 ",
"gender": "M",
"mobile": "******3603",
"email": null,
"address": "india",
"districtCode": " 490 ",
"district": "PUNE",
"stateCode": " 27 ",
"state": "MAHARASHTRA",
"abhaType": STANDARD,
"pinCode": 411017 ,
"abhaStatus": "ACTIVE",
"phrAddress": [
91608754231330@abdm
]
}
}

## 5.0 ABHA Creation via Demo Auth

This API is used to create ABHA using Demo Auth.

##### V3 URL: {{base_url}}/v3/enrollment/enrol/byAadhaar

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end- to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
BENEFIT-NAME benefit name Yes Benefit name of client
```
```
Authorization Token {{accesstoken}} Yes Token generated from session api
```
##### V3 Body parameters:


```
Property Name Value Mandatory Description
authMethods
Demo_auth
Yes Account creation method, currently it is demo
```
```
aadhaar
Encryoted
aadhaar
number
```
```
Yes User Aadhaar number encrypted by RSA
```
```
address No User personal details. It’s optional field.
Mobile No User personal details. It’s optional field.
dateOfBirth Yes User personal details
districtCode Yes User personal details
Name Yes User personal details
Gender Yes User personal details
stateCode Yes User personal details
pinCode No User personal details
Validity No User personal details
profilePhoto No User personal details
```
##### V3 Request Body:

```
Request Body
{
"authData": {
"authMethods": [
"demo_auth"
],
"demo_auth": {
"aadhaarNumber":
"cRmMrv8dA/an19TRnKxUYuzNIx+xSezheT83aQ/U1lFilzPl+h5U+/SG2uhnIWI7hro6I7LnlmqAiP5gd+buQ5aa8LeC/tnhIyIESMxtltoQOIyUmr
wOgDFQAo7BLqGyWsXJayWn0sa2yhmzxzrdIpGdaQhDMBW+Z5DFZC4ZWWoBqoEeAt69eLH+9qGA9UEmJRrbDD2vl7crHmkhSZjFnn/BcaKv
86DCHkLwmJIAgzODJknBlWglMdIkXhGhjRSNeSaVKFgpxzxzxzx4xjX2jmQnaW5FtUOjV2THjfgW6ptV0yGpe+IjUevzLcJo7skNpTjPClLTGlhXZqF
PLweDLHzbOumidhOxtrd5kt0mHQXhdR2jPcvw2J+Y/27dLUH05q5xzbiFSZm5pvGxB9bxs0M8nVmfuc6kPvHSHg3wSbXVMTkRffq/wfV5sa86x
0bsu+ewocCgq5OpMPsEJFUEGdjLWAEvaBgKpMX/pc3XJrrfaD/yGB58QjReoYkucemDCY+vJ0SlmisxvzNZtC+jhj2iVFuG5yRDewC7WR9sYsbLq
2KUUfGZ43M15CSNzmlkOAsBv/UIpcYkMeTlWe5IhRq8/Sd8oIW8x4+uyehDDwPR/F3RZJtnD1U5LBnMQHeKqDmEh6eX43KJXCBs1RCCBOao
0ifNfv1CVb2V+ZtQNqBb8TTPyJzQg=",
"districtCode": " 490 ",
"stateCode": "27",
"dateOfBirth": " 23 - 1 - 1989 ",
"gender": "M",
"name": "Yashraj Chonde",
"mobile": "{{mobile_number}}", //Optional Field
"pinCode":" 234562 " //Optional Field
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
}
}
```

##### V3 Response:

```
Response
Code: 200 OK
{
"photo": "/9j/4AAQSkZJRgABAgAAYaAF0vqVVjebUF3OVuJvs1ykkk4Ujsamph3BWlucU8RGtU5oLQ74ONuKjkc=",
"gender": "M",
"name": "Sushant Kumar Jha",
"email": null,
"phone": null,
"pincode": " 847121 ",
"birthdate": " 20 - 11 - 1997 ",
"careOf": "Avinash Kumar",
"house": null,
"street": null,
"landmark": null,
"locality": "dulha",
"villageTownCity": "Khairi Banka",
"subDist": "Bisfi",
"district": "Madhubani",
"state": "Bihar",
"postOffice": "Keoti Ranway",
"aadhaar": null,
"txnId": "4ebe8020-17a8-4c35-b39e-201bdb01d417",
"healthIdNumber": " 91 - 3111 - 6864 - XXXX",
"jwtResponse": {
"token": "eNSjzkMI",
"expiresIn": 1800 ,
"refreshToken": "eqKGvH-Yfzr0dAVys_MMaQpwrZ1mPoxWrMNGqonL-iKG2yyv22xHC_7iDbVEr7htQWtk",
"refreshExpiresIn": 1296000
},
"new": true
}
```
## 6.0 ABHA Creation via Biometrics

#### 6.2.1 Create ABHA via FingerPrint

##### Note : List of UIDAI-approved biometric devices

##### - https://uidai.gov.in/en/ecosystem/authentication-devices-

##### documents/biometrichttps://ind01.safelinks.protection.outlook.com/?url=https://uidai.gov.in/en/ecosystem/

authentication-devices-documents/biometric-
devices.html&data=05|02|Kushal.Pandita@ltimindtree.com|022d6e5cc5ca4c50ddc708dd93aaf31c|ff3552897
21e4dd7a663afec62ab9d54|0|0|638829084605444457|Unknown|TWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRyd
WUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ==|0|||&sdata=l/nQjzqQwmHiwJj++2

##### ueol9Tlnbz1iunxdtKxwPjPLQ=&reserved=0devices.html.(Kindly note that the list is updated by UIDAI

##### periodically.)

```
This API creates an ABHA account using FingerPrint.
```
```
V3 URL: {{base_url}}/v3/enrollment/enrol/byAadhaar
```

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters:**
Property Name Example Value Mandatory Description

```
authData Empty Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA enrolment. This chains all the steps to enrol in ABHA.
Transaction Id will be returned after a successful OTP transaction.
```
```
authMethods bio Yes Defines the authentication method used for enrolment, following are
the values that can be used.
```
```
BIO("bio"),
```
```
txnId Actual
Transaction Id
```
```
Yes Transaction Id received as a response to request/mobile Or Email OTP
API
fingerPrintAuthPid Encrypted
fingerPrintAuthPid
value
```
```
Yes PID value is base 64 encoded which is generated by fingerprint
scanner device.
```
```
Mobile Primary Mobile number Yes If the user wants to use a mobile number which is other than the
mobile number which is linked with the Aadhaar number
```
Consent - Yes (^)
Code abha-enrollment Yes Consent code for creating AHBA number
Version 1.4 Yes Consent version for creating ABHA number
**Note: mobile parameter in the below request is referred to as the primary mobile number
V3 Request Body:**
Request Body


###### {

```
"authData": {
"authMethods": [
"bio"
],
"bio": {
"aadhaar": "{{Encrypted Aadhaar Number}}",
"fingerPrintAuthPid": "<PID>",
"mobile": “{{mobile_number}}"
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
}
}
```
**Note: Checkpoints to generate fingerprintAuthPid:- lr = 'Y'; (This Attribute should
be passed as 'Y' otherwise it will give K-547 error) ra = deviceType;
rc = 'Y'; de = 'N'; pfr = 'N'; text = '2.5' + ra + rc + lr + de + pfr; wadh =
Base64.stringify(sha256(text)) or convert to SHA-256 and then to base64.**

##### V3 Response:

a) If the primary mobile number matches with Aadhaar linked mobile number.
Response
Code: 200 OK

```
{
"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTn
VtYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW
5zYWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1Mj
YzNzE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG
0C5eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
```

bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DD
JgtxAtP6Gem5jy-
82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXm-EIZhhwV3TXfhCg6lgnbg-YXN6668oAoGCg8G5tljjim6-
5yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosYDHphVXNPnHo
eXvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTj
t2MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXs
cQqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Nilam",
"middleName": "Pratik",
"lastName": "Jadhav",
"dob": " 26 - 11 - 1999 ",
"gender": "F",
"photo": "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",
"mobile":"******1670"
"email":"******1670"
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": " 27 ",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}


b) If the primary mobile number is different from Aadhaar linked mobile number.

```
Response
```
Code : 200 OK


###### {

"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTnV
tYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW5z
YWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1MjYzN
zE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG0C5
eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DDJ
gtxAtP6Gem5jy-82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXmEIZhhwV3TXfhCg6lgnbg-
YXN6668oAoGCg8G5tljjim65yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosY
DHphVXNPnHoe XvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC
1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTjt2
MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXsc
QqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Priyanka",
"middleName": "Sudhir",
"lastName": "Varude",
"dob": " 26 - 11 - 1989 ",
"gender": "F",
"photo": "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",
"mobile": null,
"email": null,
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": "27",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}

```
Note:
```
**1. If the primary mobile number matches with Aadhaar linked mobile number then mobile is**
    **saved in DB and if the primary mobile number is different from Aadhaar linked mobile number**
    **then mobile is not saved and its value is null.
2. In case mobile number is null, it can be update using mobile updation APIs. To update the**
    **mobile number please refer Section: 3 (Step 4- ABHA Mobile Verification).
3. After creating account, need to create ABHA address. For ABHA address creation please**
    **refer Section: 3 (Step 6: ABHA Suggestions and ABHA Address creation).**


#### 6.2.2 Create ABHA via FaceAuth

**Step 1 : Generate the Transaction Id**

```
This API will help to generate transaction id. This transaction Id will be used for whole face authentication process.
The user can submit this transaction ID to the ABHA app using either intent-based sharing or by generating a
QR code.User can use this transaction ID to generate QR code using any QR generator tool. Open ABHA app and
scan this QR code on ABHA App to start and complete the face capture process.
```
```
The data format of the QR code should follow this pattern:
https://<phr-env-base-url>/face-auth?txnId=<txn-id-from-the-response-of-init-api>.
```
```
For example: https://phrsbx.abdm.gov.in/face-auth?txnId=bac7251b-cd25-44d5- 9707 - f3d2ba181c1c
```
```
V3 URL : {{base_url}}/v3/enrollment/enrol/auth/init
```
```
V3 Request: POST
V3 Request Headers:
```
```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
```
scope "abha-enrol",
“face-auth"
```
```
Yes Scope is Mandatory to generate transactionId. Transaction Id will be
returned after a successful request.
```
```
V3 Request Body:
Request Body
{
" scope": [
"abha-enrol",
"face-auth"
```

```
]
}
```
**V3 Response :**

```
{
“txnId” : “23acf181-339d- 4771 - b532-5c5df4a28d19”
“message” : “Transaction Id generated Successfully”
}
```
**Step 2 : Check The status of the Transaction Id**

```
This API is designed to verify the status of a transaction ID that was generated during the invocation of the auth/init API. It
serves as a follow-up mechanism to ensure that the transaction is still valid, active, and has not expired or been
invalidated.
```
```
The reponse of the API will return status of that transactionId. It can be either PENDING,VERIFIED,FAILED,COMPLETE.
```
```
Once the status in the response of this API is returned as COMPLETE , it indicates that the face authentication process has
been successfully completed. At this stage, the next step is to invoke the enrolment/enrol/byAadhaar API to proceed
further.
```
```
User can poll the /capturePID API in every 5 - 10 seconds interval to check the status of face capture process or
alternatively skip this step and call the /byAadhaar API once they see the PID submission success message in the ABHA
app.
```
```
V3 URL : {{base_url}}/v3/enrollment/enrol/capturePID
V3 Request: POST
```
```
V3 Request Headers:
```
```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
```

```
Property Name Example Value Mandatory Description
```
```
scope "abha-enrol",
"face-verify"
```
```
Yes Scope is Mandatory to check the status of the transaction Id.^
```
```
txnId “{{transactionId}}” Yes Transaction Id generated by you by calling^ auth/init^ will be used here^
```
```
V3 Request Body:
Request Body
{
" scope": [
"abha-enrol",
"face-verify"
],
"txnId": "93f4e14e-d5f1-447b-a6f5-f7f72428b50a"
}
```
**V3 Response based on status:**

If the status is **PENDING:**

```
{
"status": "PENDING",
"message": "Awaiting PID capture"
}
```
If the status is **VERIFIED:**

```
{
"status": "VERIFIED",
"message": "Awaiting PID capture"
}
```
If the status is **FAILED:**


###### {

```
"status": "FAILED",
"message": "PID capture failed. Please regenarate the QR Code. "
}
```
If the status is **COMPLETED:**

```
{
"status": "COMPLETE",
"message": "PID captured successfully",
" txnId ": " ea1dc7aa-d7c3-40ab-bee8-84c6f1eb90fc "
}
```
```
Step 3 : Create ABHA using Face Auth
```
```
This API creates an ABHA account using FaceAuth.
```
```
V3 URL: {{base_url}}/v3/enrollment/enrol/byAadhaar
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
```
```
authData Empty Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA enrolment. This chains all the steps to enrol in ABHA.
Transaction Id will be returned after a successful OTP transaction.
```

```
authMethods face_auth Yes Defines the authentication method used for enrolment, following are
the values that can be used.
```
```
face_auth
```
```
txnId Actual
Transaction Id
```
```
Yes Transaction Id received as a response to auth/init API
```
```
aadhaar Encrypted Aadhaar
number
```
```
Yes Encrypted aadhaar number of a user
```
```
Mobile Primary Mobile number Yes If the user wants to use a mobile number which is other than the
mobile number which is linked with the Aadhaar number
```
Consent - Yes (^)
Code abha-enrollment Yes Consent code for creating AHBA number
Version 1.4 Yes Consent version for creating ABHA number
**Note: mobile parameter in the below request is referred to as the primary mobile number
V3 Request Body:**
Request Body
{
"authData": {
"authMethods": [
"face_auth"
],
"face": {
"txnId": "{{transactionId}}",
"aadhaar": "{{Encrypted Aadhaar Number}}",
"mobile": “{{mobile_number}}"
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
} }

###### V3 RESPONSE:


###### {

"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTn
VtYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW
5zYWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1Mj
YzNzE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG
0C5eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DD
JgtxAtP6Gem5jy-
82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXm-EIZhhwV3TXfhCg6lgnbg-YXN6668oAoGCg8G5tljjim6-
5yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosYDHphVXNPnHo
eXvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTj
t2MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXs
cQqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Nilam",
"middleName": "Pratik",
"lastName": "Jadhav",
"dob": " 26 - 11 - 19 **",
"gender": "F",
"photo": "/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDc
pLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMj
L/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQID
AAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1


```
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",
"mobile":"******1670"
"email":"******1670"
"phrAddress": [
"91160145481380@sbx"
],
"address": " 16 */2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": " 27 ",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}
```
B ) If the primary mobile number is different from Aadhaar linked mobile number.

```
Response
```
```
Code : 200 OK
{
"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTnV
tYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW5z
YWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1MjYzN
zE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG0C5
eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTES-
aCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DDJgtxAtP6Gem5jy-
82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXmEIZhhwV3TXfhCg6lgnbg-YXN6668oAoGCg8G5tljjim6-
```

PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5K
R5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Priyanka",
"middleName": "Sudhir",
"lastName": "Varude",
"dob": " 26 - 11 - 19 xx",
"gender": "F",
"photo": "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",
"mobile": null,
"email": null,
"phrAddress": [
"91160145481380@sbx"
],


"stateCode": "27",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}

```
Note:
```
**1. If the primary mobile number matches with Aadhaar linked mobile number then mobile is**
    **saved in DB and if the primary mobile number is different from Aadhaar linked mobile number**
    **then mobile is not saved and its value is null.
2. In case mobile number is null, it can be update using mobile updation APIs. To update the**
    **mobile number please refer Section: 3 (Step 4- ABHA Mobile Verification).
3. After creating account, need to create ABHA address. For ABHA address creation please**
    **refer Section: 3 (Step 6: ABHA Suggestions and ABHA Address creation).**

#### 6.2.3 Create ABHA via IrisAuth

```
This API creates an ABHA account using IrisAuth.
```
```
V3 URL: {{base_url}}/v3/enrollment/enrol/byAadhaar
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
```

```
authData Empty Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA enrolment. This chains all the steps to enrol in ABHA.
Transaction Id will be returned after a successful OTP transaction.
```
```
authMethods iris Yes Defines the authentication method used for enrolment, following are the
values that can be used.
```
```
IRIS("iris"),
```
```
txnId Actual
Transaction Id
```
```
Yes Transaction Id received as a response to request/mobile Or Email OTP
API
pid Encrypted PID value Yes PID value is base 64 encoded which is generated by iris scan device.
```
```
Mobile Primary Mobile number Yes If the user wants to use a mobile number which is other than the mobile
number which is linked with the Aadhaar number
```
Consent - Yes (^)
Code abha-enrollment Yes Consent code for creating AHBA number
Version 1.4 Yes Consent version for creating ABHA number
**Note: mobile parameter in the below request is referred to as the primary mobile number
V3 Request Body:**
Request Body
{
"authData": {
"authMethods": [
"iris"
],
"iris": {
"aadhaar": "{{Encrypted Aadhaar Number}}",
"pid": "<PID>",
"mobile": "{{mobile_number}}"
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
}
}

##### V3 Response:

a) If the primary mobile number matches with Aadhaar linked mobile number.
Response
Code: 200 OK


###### {

"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTn
VtYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW
5zYWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1Mj
YzNzE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG
0C5eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dwbJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2
AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DDJgtxAtP6Gem5jy-
82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXm-EIZhhwV3TXfhCg6lgnbg-YXN6668oAoGCg8G5tljjim6-


```
5yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosYDHphVXNPnHo
eXvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTj
t2MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXs
cQqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Nilam",
"middleName": "Pratik",
"lastName": "Jadhav",
"dob": " 26 - 11 - 1999 ",
"gender": "F",
"photo": "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",
"mobile":"******1670"
"email":"******1670"
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": " 27 ",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}
```
b) If the primary mobile number is different from Aadhaar linked mobile number.


```
Response
```
Code : 200 OK


###### {

"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTnV
tYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW5z
YWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1MjYzN
zE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG0C5
eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DDJ
gtxAtP6Gem5jy-82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXmEIZhhwV3TXfhCg6lgnbg-
YXN6668oAoGCg8G5tljjim65yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosY
DHphVXNPnHoe XvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC
1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTjt2
MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXsc
QqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Priyanka",
"middleName": "Sudhir",
"lastName": "Varude",
"dob": " 26 - 11 - 1989 ",
"gender": "F",
"photo": "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",
"mobile": null,
"email": null,
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": "27",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}

```
Note:
```
**1. If the primary mobile number matches with Aadhaar linked mobile number then mobile is**
    **saved in DB and if the primary mobile number is different from Aadhaar linked mobile number**
    **then mobile is not saved and its value is null.
2. In case mobile number is null, it can be update using mobile updation APIs. To update the**
    **mobile number please refer Section: 3 (Step 4- ABHA Mobile Verification).
3. After creating account, need to create ABHA address. For ABHA address creation please**
    **refer Section: 3 (Step 6: ABHA Suggestions and ABHA Address creation).**

## 7.0 ABHA verification

### 7.1 Login via Aadhaar OTP

### Step 1: Generate OTP

```
This API accepts the encrypted ABHA number and then generates OTP for Aadhaar linked mobile
number.
```

**V3 URL:** {{base_url}}/v3/profile/login/request/otp

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the endtoend
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the
date and time by starting with the
year, followed by the month, the day,
the hour, the minutes, seconds, and
milliseconds
Authorization
Token
```
```
{{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar- verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint Abha-number Yes Type of login, following are the values that can be used.
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
```
loginId Encrypted ABHA
number
```
```
Yes Actual value of login type. This needs to be RSA encrypted using a
public key
```
```
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values
that can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
**V3 Request Body:**


```
Request Body^^
```
```
{^
"scope": [
"abha-login",
"aadhaar-verify"
],
"loginHint": "abha-number",
"loginId":
"eP7sVhb5mxtlleG1xKUUTYDvcUoVBFDewpYFcA+pwFAOTsvZ/yTEOgyCfRKXcUKG0fTvAjtU73OIR9aJAu2llr6FWM8pwcdWlvZgP8YR6+X/8
rxvcuYYyGkBuwB6zoXeHE7ZwTDHNCUwEFyWLwBpNkbYJ+vbtYLlyB7y3fRk+cJtB+iJq/IOQaLYZQoYqR4aTMutqQaopWukaBRz1h/0LSFh2PI
fOxfSMKymOFvS33OqVVmqQ6p9aajm5zuFW/dG86oeN5qFZHaPjN/dx2Rv0VWlLIvAm8J+ZQGuJovm0OuPmfaL+FZgbjJDLPMAmhUYm+
WBv9GPqWbxt3sjYtQy2Th6y4j12Nw+O++9eKuwBmZ28Vdo6w/ulp1kmKzZvMdVUGp1piF6h/ru6r5k4nNT+C6ib6BB8rH8qcBs00nrX4WjzJ
iVgOAuvvZxAsCMzAXf+cep6RXZgeg68ORouvoA9mCv2xyOWKAkc+eJ7Y6GcdT3Vvl0Kqa/awqUpY/Tsppk7RVGAN2w2RL+SX7/V6Sa7o2Gw
JIJJFgGhihUWlHkX3yaCyS7wCIMFzeLHlC4bTPb0lyoyYnM3MxvPtWl6Rlq08eyZFSUeEhpa+nTfVPjok6j7p2WjBXRLn4ynxwr4yYpiiONIgnHta
ziUPvcW47B+sb28ZLqU1Gpldfcw8bXJrcHqc=",
"otpSystem": "aadhaar"
}
```
**V3 Response:**
Response
Code: 200 OK
{
"txnId": "01a71f23-b26f-463a-b54b-ea50446eaee9",
"message": "OTP is sent to Aadhaar registered mobile number ending with *******0161”
}

### Step 2: Verify OTP

This API accepts OTP from the user, once the OTP is successfully validated a session token is generated.

**V3 URL:** {{base_url}}/v3/profile/login/verify

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-7a57d5f669a8 Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date
and time by starting with the year,
followed by the month, the day, the hour,
the minutes, seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```

##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar- verify
```
```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for ABHA
login.
```
```
otpValue Encrypted OTP
value
```
Yes (^)
authMethods otp Yes Type of login, following are the values that can be used
OTP("otp"),
PASSWORD("password"),
**V3 Request Body:**
Request Body^
{
"scope": [
"abha-login",
"aadhaar-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " _{{txnId}}_ ",
"otpValue": " _{{OTP_encryption}}_ "
}
}
}


**V3 Response:**

```
Response^
```
**Code: 200 OK** (^)
{
"txnId": "15fbec8b- 0168 - 471d- 8691 - 003c183a24fb",
"authResult": "success",
"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0yNTY4LTcwNzMtNDgxOSIsImNsaWVudEl
kIjoiYWJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJtb2JpbGUiOiI5ODcyNjk5MjYwIiwiYWJoYU
51bWJlciI6IjkxLTI1NjgtNzA3My00ODE5IiwicHJlZmVycmVkQWJoYUFkZHJlc3MiOm51bGwsInR5cCI6IlRyYW5zYWN0aW
9uIiwiZXhwIjoxNzA3MTI0MDI4LCJpYXQiOjE3MDcxMjIyMjgsInR4bklkIjoiMTVmYmVjOGItMDE2OC00NzFkLTg2OTEtMDA
zYzE4M2EyNGZiIn0.OqM17elgGWTYizhn6RIw3VlepK1ClcXdbw6ry8dDjPZepzbngrGQVUn0Na4uT7bMjgRXC3mNTaUZWvJGLLCYnEXijtqImzyQ
ATTHI_4KlTlAd4PSEyZlmPjdFRiSoaz_etNt
6RPDt9q5 tze64YLudufxsiCfDkfr0J6w6yK3crWYkobCIKMokVzVdnGM9X1ysEduK-bozTIPvsyXwdfa3dc9km5nFCIcFWaXQajPk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9. wEvha4yvYo4WNYMxigG7ObhAKL6ICUJGQ9hiGCglPwc2e1FrFXmw5W ",
"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": "91- 4819 - 7073 - XXXX",
"preferredAbhaAddress": "guneetarora@sbx",
"name": "Guneet Singh Arora",
"status": "ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nIC
IsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy
MjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB9QE80yB+ar6jDFd6dNazcxzq0bgHBKkEHH4VJnimzH9x9
TTA+bdQtXs7+4tpCpkhlaNyvTcpwcfiKpnrXW+P7E2niy4YKqpcIsyhfcYJPuWVjXJHpVoBvU4FdVoN5aafFtyCzcs2OSa
w9KhgeZpbj/Vp0Hqat3MFk7BoJjGeoDMMfzrOpZ+6zWCa1R6Bp+qWc0qASAbuma3WeMBMMmGbH1+leTWcjRnBb
cvsa7bQ7uRrcIXJA+6PQVyygom6k5bm9PNDAMysqj3rGuPENhCflkDHOMYrG1y/kaR4t/U8CuXkt5riY/vD15JojTi9WNy a2L/iOaz1CYXMACzdGA/
ACP+BV65bda4rwLYf2d4ct1YYef9+/OR8wGPp8oXj1zXb2i/ ="
}
] }

### 7.2 Login via Aadhaar Number

### Step 1: Generate OTP

This API accepts the encrypted Aadhaar Number and then generates OTP for Aadhaar linked ABHA
number.

**V3 URL:** {{base_url}}/v3/profile/login/request/otp

##### V3 Request: POST

##### V3 Request Headers:


```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the endtoend
request transaction
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date
and time by starting with the year,
followed by the month, the day, the
hour, the minutes, seconds, and
milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar- verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint aadhaar
Yes Type of login, following are the values that can be used.
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
```
loginId Encrypted
aadhaar number
```
```
Yes Actual value of login type. This needs to be RSA encrypted using a
public key
```
```
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values
that can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
Request Body
```

###### {

```
"scope": [
"abha-login",
"aadhaar-verify"
],
"loginHint": "aadhaar",
"loginId":
"eP7sVhb5mxtlleG1xKUUTYDvcUoVBFDewpYFcA+pwFAOTsvZ/yTEOgyCfRKXcUKG0fTvAjtU73OIR9aJAu2llr6FWM8pwcdWlvZgP8YR6+X/8
rxvcuYYyGkBuwB6zoXeHE7ZwTDHNCUwEFyWLwBpNkbYJ+vbtYLlyB7y3fRk+cJtB+iJq/IOQaLYZQoYqR4aTMutqQaopWukaBRz1h/0LSFh2PI
fOxfSMKymOFvS33OqVVmqQ6p9aajm5zuFW/dG86oeN5qFZHaPjN/dx2Rv0VWlLIvAm8J+ZQGuJovm0OuPmfaL+FZgbjJDLPMAmhUYm+
WBv9GPqWbxt3sjYtQy2Th6y4j12Nw+O++9eKuwBmZ28Vdo6w/ulp1kmKzZvMdVUGp1piF6h/ru6r5k4nNT+C6ib6BB8rH8qcBs00nrX4WjzJ
iVgOAuvvZxAsCMzAXf+cep6RXZgeg68ORouvoA9mCv2xyOWKAkc+eJ7Y6GcdT3Vvl0Kqa/awqUpY/Tsppk7RVGAN2w2RL+SX7/V6Sa7o2Gw
JIJJFgGhihUWlHkX3yaCyS7wCIMFzeLHlC4bTPb0lyoyYnM3MxvPtWl6Rlq08eyZFSUeEhpa+nTfVPjok6j7p2WjBXRLn4ynxwr4yYpiiONIgnHta
ziUPvcW47B+sb28ZLqU1Gpldfcw8bXJrcHqc=",
"otpSystem": "aadhaar"
}
```
**V3 Response:**
Response
Code: 200 OK
{
"txnId": "01a71f23-b26f-463a-b54b-ea50446eaee9",
"message": "OTP is sent to Aadhaar registered mobile number ending with *******0161”
}

### Step 2: Verify OTP

This API accepts OTP from the user, once the OTP is successfully validated a session token is generated.

**V3 URL:** {{base_url}}/v3/profile/login/verify

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-7a57d5f669a8 Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date
and time by starting with the year,
followed by the month, the day, the hour,
the minutes, seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```

##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar- verify
```
```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"), EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
```
```
otpValue Encrypted OTP
value
```
Yes (^)
authMethods otp Yes Type of login, following are the values that can be used
OTP("otp"),
PASSWORD("password"),
**V3 Request Body:**
Request Body^


###### {

```
"scope": [
"abha-login",
"aadhaar-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " {{txnId}} ",
"otpValue": " {{OTP_encryption}} "
}
}
}
```
**V3 Response:**
Response

```
Code: 200 OK
```
```
{
"txnId": "15fbec8b- 0168 - 471d- 8691 - 003c183a24fb",
"authResult": "success",
"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0yNTY4LTcwNzMtNDgxOSIsImNsaWVudEl
kIjoiYWJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJtb2JpbGUiOiI5ODcyNjk5MjYwIiwiYWJoYU
51bWJlciI6IjkxLTI1NjgtNzA3My00ODE5IiwicHJlZmVycmVkQWJoYUFkZHJlc3MiOm51bGwsInR5cCI6IlRyYW5zYWN0aW
9uIiwiZXhwIjoxNzA3MTI0MDI4LCJpYXQiOjE3MDcxMjIyMjgsInR4bklkIjoiMTVmYmVjOGItMDE2OC00NzFkLTg2OTEtMDA
zYzE4M2EyNGZiIn0.OqM17elgGWTYizhn6RIw3VlepK1ClcXdbw6ry8dDjPZepzbngrGQVUn0Na4uT7bMjgRXC3mNTaUZWvJGLLCYnEXijtqImzyQ
ATTHI_4KlTlAd4PSEyZlmPjdFRiSoaz_etNt
6RPDt9q5 tze64YLudufxsiCfDkfr0J6w6yK3crWYkobCIKMokVzVdnGM9X1ysEduK-bozTIPvsyXwdfa3dc9km5nFCIcFWaXQajPk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9. wEvha4yvYo4WNYMxigG7ObhAKL6ICUJGQ9hiGCglPwc2e1FrFXmw5W ",
"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": "91- 4819 - 7073 - XXXX",
"preferredAbhaAddress": "guneetarora@sbx",
"name": "Guneet Singh Arora",
"status": "ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nIC
IsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy
MjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB9QE80yB+ar6jDFd6dNazcxzq0bgHBKkEHH4VJnimzH9x9
TTA+bdQtXs7+4tpCpkhlaNyvTcpwcfiKpnrXW+P7E2niy4YKqpcIsyhfcYJPuWVjXJHpVoBvU4FdVoN5aafFtyCzcs2OSa
w9KhgeZpbj/Vp0Hqat3MFk7BoJjGeoDMMfzrOpZ+6zWCa1R6Bp+qWc0qASAbuma3WeMBMMmGbH1+leTWcjRnBb
cvsa7bQ7uRrcIXJA+6PQVyygom6k5bm9PNDAMysqj3rGuPENhCflkDHOMYrG1y/kaR4t/U8CuXkt5riY/vD15JojTi9WNy
a2L/iOaz1CYXMACzdGA/ ACP+BV65bda4rwLYf2d4ct1YYef9+/OR8wGPp8oXj1zXb2i/ ="
}
] }
```

### 7.3 Login via Abha OTP

### Step 1: Generate OTP

```
This API accepts the encrypted ABHA number and then generates OTP for Abha linked mobile
number.
```
```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

```
Yes Unique UUID for tracking the endtoend
request transaction
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date
and time by starting with the year,
followed by the month, the day, the
hour, the minutes, seconds, and
milliseconds

Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
mobile-verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint abha-number Yes Type of login, following are the values that can be used.
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```

```
loginId Encrypted
Abha number
```
```
Yes Actual value of login type. This needs to be RSA encrypted using a
public key
otpSystem abdm Yes Otp system to verify hiu/hip/phr login, following are the values
that can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
```
Request Body^
{
"scope": [
"abha-login",
"mobile-verify"
],
"loginHint": "abha-number",
"loginId": " _{{Abha_encryptedOutput}}_ ",
"otpSystem": "abdm"
}

```
V3 Response:
Response
Code: 200 OK
```
```
{
"txnId": "cef6460d-a068-4c84-ae78-407fe6ad13d4",
"message": "OTP sent to mobile number ending with ******4723"
}
```
### Step 2: Verify OTP

```
This API accepts encrypted OTP from the user, once the OTP is successfully validated a session token is
generated.
```
```
V3 URL: {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-7a57d5f669a8 Yes Unique UUID for tracking the end-to-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date
and time by starting with the year,
followed by the month, the day, the hour,
the minutes, seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login, mobile-
verify
```
```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for ABHA
login.
```
```
otpValue Encrypted OTP
value
```
Yes (^)
authMethods otp Yes Type of login, following are the values that can be used
OTP("otp"),
PASSWORD("password"),
**V3 Request Body:**
Request Body^


###### {

```
"scope": [
"abha-login",
"mobile-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " {{txnId}} ",
"otpValue": " {{OTP_encryption}} "
}
}
}
```
```
V3 Response:
Response^
```
**Code: 200 OK** (^)
{
"txnId": "15fbec8b- 0168 - 471d- 8691 - 003c183a24fb",
"authResult": "success",
"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0yNTY4LTcwNzMtNDgxOSIsImNsaWVudElkIjoiYWJoYS1wcm9ma
WxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJtb2JpbGUiOiI5ODcyNjk5MjYwIiwiYWJoYU51bWJlciI6IjkxLTI1NjgtNzA3My00ODE5Iiwic
HJlZmVycmVkQWJoYUFkZHJlc3MiOm51bGwsInR5cCI6IlRyYW5zYWN0aW9uIiwiZXhwIjoxNzA3MTI0MDI4LCJpYXQiOjE3MDcxMjIyMjgsInR
4bklkIjoiMTVmYmVjOGItMDE2OC00NzFkLTg2OTEtMDAzYzE4M2EyNGZiIn0.OqM17elgGWTYizhn6RIw3VlepK1ClcXdbw6ry8dDjPZepzbngr
GQVUn0Na4uT7bMjgRXC3mNTaUZWvJGLLCYnEXijtqImzyQATTHI_4KlTlAd4PSEyZlmPjdFRiSoaz_etNt6RPDt9q5tze64YLudufxsiCfDkfr0J6w6
yK3crWYkobCIKMokVzVdnGM9X1ysEduK-bozTIPvsyXwdfa3dc9km5nFCIcFWaXQajPk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9. wEvha4yvYo4WNYMxigG7ObhAKL6ICUJGQ9hiGCglPwc2e1FrFXmw5W ",
"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": "91- 4819 - 7073 - XXXX ",
"preferredAbhaAddress": "guneetarora@sbx",
"name": "Guneet Singh Arora", "status":
"ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0
Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCA
DIAKADASIAAhEBAxEB9QE80yB+ar6jDFd6dNazcxzq0bgHBKkEHH4VJnimzH9x9TTA+bdQtXs7+4tpCpkhlaNyvTcpwcfiKpnrXW+P7E2niy4YKq
pcIsyhfcYJPuWVjXJHpVoBvU4FdVoN5aafFtyCzcs2OSaw9KhgeZpbj/Vp0Hqat3MFk7BoJjGeoDMMfzrOpZ+6zWCa1R6Bp+qWc0qASAbuma3
WeMBMMmGbH1+leTWcjRnBbcvsa7bQ7uRrcIXJA+6PQVyygom6k5bm9PNDAMysqj3rGuPENhCflkDHOMYrG1y/kaR4t/U8CuXkt5riY/vD15
JojTi9WNya2L/iOaz1CYXMACzdGA/ ACP+BV65bda4rwLYf2d4ct1YYef9+/OR8wGPp8oXj1zXb2i/ ="
}
] }

### 7.4 Login via Mobile OTP


### Step 1: Generate OTP

API accepts mobile numbers and then generates OTP for the entered mobile number.

**V3 URL:** {{base_url}}/v3/profile/login/request/otp

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request
was initiated, ISO 8601 represents
the date and time by starting with
the year, followed by the month, the
day, the hour, the minutes, seconds,
and milliseconds
Authorization
Token
```
```
{{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
mobile-verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint mobile Yes Type of login, following are the values that can be used
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
```
loginId Encrypted
Mobile number
```
```
Yes Actual value of login type. This needs to be RSA encrypted using
public key
```

```
otpSystem abdm Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request body:
Request Body^
{
"scope": [
"abha-login",
"mobile-verify"
],
"loginHint": "mobile",
"loginId": " {{Mobile_Encryption}} ",
"otpSystem": "abdm"
}
```
```
V3 Response:
```
Response^

**Code: 200 OK** (^)
{
"txnId": "67f12929-22fd- 4826 - a8f3-a6fef3e11244",
"message": "OTP sent to mobile number ending with ******9260"
}

### Step 2: Verify OTP

```
This API accepts encrypted OTP from the user, once the OTP is successfully validated a session token
is generated along with the list of ABHA numbers (ACTIVE and DEACTIVATED) linked with the mobile
number.
```
```
V3 URL: {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request
was initiated, ISO 8601 represents
the date and time by starting with
the year, followed by the month, the
day, the hour, the minutes, seconds,
and milliseconds
```
```
Authorization
Token
```
```
{{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
mobile-verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"), EMAIL_VERIFY("email-
verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
authMethods otp Yes Type of login, following are the values that can be used
```
```
OTP("otp"),
PASSWORD("password"),
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
otpValue Encrypted OTP
value
```
Yes (^)
**V3 Request Body:**
Request Body


###### {

```
"scope": [
"abha-login",
"mobile-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " {{txnId}} ",
"otpValue": " {{OTP_encryption}} "
}
}
}
```
```
V3 Response:
```
Response^

**Code: 200 OK** (^)
{
"txnId": "ec5d10f4-41c9-4d7e-b857-4a77b04a35b7",
"authResult": "success",
"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5ODcyNjk5MjYwIiwiY2xpZW50SWQiOiJhYmhhLXByb2ZpbGUtYXBwLWFwaSIsIn
N5c3RlbSI6IkFCSEEtTiIsIm1vYmlsZSI6Ijk4NzI2OTkyNjAiLCJ0eXAiOiJUcmFuc2ZlciIsImV4cCI6MTcwNzEyMzM2MywiaW
F0IjoxNzA3MTIzMDYzfQ.Jn9Xt0UuiVJ61-9paqnr0KWoy9T6pdc2QKQRv5qH6NlCuJcoYq-ch8JVM7xHa6CkgDvT4PZj_
",
"expiresIn": 300 ,
"accounts": [
{
"ABHANumber": "91- 2568 - 7073 - XXXX",
"preferredAbhaAddress": "guneetarora@sbx",
"name": "Guneet Singh Arora",
"gender": "M",
"dob": "07- 03 - 1997",
"status": "ACTIVE", "profilePhoto":
"/9j/zVr7GGNefc7jIEYzjFLKmwZNaotkU4A5qveRooztpXGY3lGe4RNu4kgBSM7j2Fen2MC29vHChJCKFyep964rSYkWc
XUzKiqQF8xwgB/vc9QCVHHfHvXbWs8dxAs0EkcsbdHjcMDjjgjrXo0YcsTgrT5pBMWWynkX7yxtjnHIFVwvlbY5BuUj589i
Rzj061dj+YlCM5JqNh56O+CcsxBPpk4rUyZFKJ13zQHzE2fKg9Qp7e5x09acl6pco4IOSAQMjg4/MnPHtUdrJ5c/lE8HpVu
SBJTuK/OMfOOCMdOaVgRLFKrqGRgynuDmpw3FY32Sa3Km3fI3AHHB2/
/Nzz+WfNfLI/7pJbuXkbY2GxfYtyM9QcZyDRRQtQZWn03U70lprt7WLGPKt2Izxj5j/EcADnPTtWzpOnzRafJJYhZJ0lwVbM
anoQAccgBsZx1zRRTa0EpNGfFcRyXE8SRoojYkBGBG3dgY/Nf++gOatDGOKKK82vFRloelSk3HUgcYYnNRR239o38Vpn
G/JLegHU/0+poopUopyVx1JNRbQmr+bpV/aRWLRSzRAxmJskAHaQTg5BAUdcZD5ycVJBrUqS+ZqViBJtCm4tC2SA2
4Bh98KPQFs/3T0oor0kjzeZnU2ModAwmWbnKsuPmX+E8d8DH1B6dKbp7Smwg81NknlLvTH3WIyR+tFFMorz5Vgw6g1
owS70Vs+xoopMS3Eb5W9qbJFHcgFwcjIDDqAQQf59DRRSGf/9k=",
"kycVerified": true
}
] }

### Step 3: Verify User.


```
This API accepts the ABHA number and transaction id, once both are validated a session token is
generated.
```
```
V3 URL: {{base_url}}/v3/profile/login/verify/user
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the endtoend
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the
date and time by starting with the
year, followed by the month, the day,
the hour, the minutes, seconds, and
milliseconds
```
Authorization Token {{accesstoken}} Yes Token generated from session API

T-token Bearer {{token}} Yes Token received in login/verify API. Its’
valid for 5mins.

##### V3 Body parameters:

```
Property Name Value Mandatory Description
ABHANumber AbhaNumber Yes 14 - digit ABHA number
```
```
txnId 9b4ce0f9-3a27-
4598a02ab889479f4fb0
```
```
Yes Transaction Id is Mandatory to identify the unique
transaction for ABHA login generated from Verify OTP
step.
```
```
V3 Request Body:
```
Request Body^

```
{
"ABHANumber":" {{AbhaNumber}} ",
"txnId":" {{txnId}} " }
```
```
V3 Response:
Response^
```

**Code :200 OK** (^)

###### {

"token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS00MTczLTMyNTMtNTQwNiIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJtb2JpbGUiOiI3ODEzMDEwMTYxIiwiYWJoYU51bWJlciI6IjkxLTQxNzMtMzI1My01
NDA2IiwicHJlZmVycmVkQWJoYUFkZHJlc3MiOiI5MTQxNzMzMjUzNTQwNkBhYmRtIiwiZXhwIjoxNjc0Njc0OTI1LCJpYXQi
OjE2NzMzNzg5MjUsInR4bklkIjoiODY1MjEzODgtZThkNS00NzJjLWFmYzEtYjEyZjE0ZDgyMGM4In0.OiNgxXenYMMliGNtNx4OPr29qyXYBunU
a3DSKyy2TRRWRNZfP1bW6CWNlz-
9QbKnfgmDx44Q9QMkQwRxJBnbaA9A9SmchriMgG1OWc6H1DittwzdUSfhUkNDAbr1eHLbtXcbKqAAIPhZ9uWw7nshhxKXkYmMWPGAUm
9T-
N746Lb4P1qQQfo6RQA7r4fq5g_6fyhFxnlz2_HV2XSVy3gyZZ3aJPmM0APZLMjLYbvkoxV8HXWcYXLXYW7EYdRCh8unJ
eY3Px2VDqvdsJr3z8jmsGsbltxTBtymoJBo3rR243zO2u-wf1dEZuZbsiNko5Yeu67Mu2p3o6z6bAoMzK6crxcus0gw0kuAkUuC8md1Xy4-
FD98TtUmETa5umWW3zs155_J4rK9cd1wmNP0MLRjCt5hRpqfFxmrSWNatw61VdQp6enUAg9Kkf8eLLIaQFv_qSIKyhMgSFXjKk2PBU2nvC3 L
uDcqf_YxCxqzwXc_rrzOLN2h6MzGYQgtXqf1gsrD_IQ7H14-
BZwkrDeYMVsDSiZCFGqJfDJBLQNIfc7eZKGmkjTFz_ldUL4EaIJ3qX2TblMCCW5UA2IYbLJPcICPaCLXApf2zpaOnZmBh
Ur8ycDYTCVnMt6XpZm7J5by-CAcYa0v0rTN7H-RbJOEq3loLiooPf4dWZd4UUrTA",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS00MTczLTMyNTMtNTQwNiIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNjc0Njc0OTI1LCJpYXQiOjE2NzMzNzg5MjV
9.cyskKue4BcVt-vpx5rCVUeocEXYtzFAubtmJHaaPUtd4AOdUnhlyOJSBNkHk5IlJcwdpqrRntWj5ynpTFJ8nGnRRi2fbP6Cu89y29K0AnPm
SFeaO9kNm1LM53ZA5I9VwAAN3zLqySm8s6ccPFKf_p-ewHvb73k2k2InjpjTsww_kmVtHs4R46EuhzoKXYx48TOVmsraO1ScfAjYm-
R1LZ66T42PXVrJaZ6RSrRmuW6Xc_N7cmDermpjmO3to1ZinEAry8jcHZXnmTTWCTwXzzST4TFOQ7fQn_t4xmtUQr1QHKcF4M-
mpKCRfbaGBazz6DldpvC2HEkbROIz8_XQDUIgPOon2JX2sMQ27IzobPp4LRwiVTKtpAOprTvRVBqW4i6GirYf3i7JXgv4
UOtYQOLfnKOh7lZsbtph4tXfIgWWzZ8dzinWRdUUWVEZDP_Fn5oPm1EqH87JDM6mNTQExfrAZ4PxsgAkNXZnxjkV6fCKj
KshwsZmgnJtwHiA2Ep48z2zaWQnNqEfMxb_cLmfa6ZqDY_2MAVsFddGgj3Hguekdb8kcC_OJ705qaGh2XwflS67rT
TZSehTC1-UZyXA0sQPSN4FLvY3D-mM4VhHNB7Kp-xEJHOkKS_3Gz7LqpfCiTPyJ4EEOvbvWb1HgMBXHv3kGuuay4srGisZ4mjE",
"refreshExpiresIn": 1296000 }

### 7.5 Login via Biometric

#### 7.5.1 Login via FaceAuth

### Step 1: Send Biometric Verification Request

```
API accepts ABHA number and then by verifying the account will send the face verification request to
the application.
```
```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request
was initiated, ISO 8601 represents
the date and time by starting with
the year, followed by the month, the
day, the hour, the minutes, seconds,
and milliseconds
```
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar-face-
verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
AADHAAR_FACE_VERIFY("aadhaar-face-verify"),
AADHAAR_BIO_VERIFY("aadhaar-bio-verify"),
AADHAAR_IRIS_VERIFY("aadhaar-iris-verify"),
```
```
loginHint ABHA number Yes Type of login, following are the values that can be used
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
```
loginId Encrypted ABHA
number
```
```
Yes Actual value of login type. This needs to be RSA encrypted using
public key
```
```
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request body:
Request Body^
```

###### {

```
"scope": [
"abha-login",
"aadhaar-face-verify"
],
"loginHint": "abha-number",
"loginId": " {{Abha_Number Encrypted}} ",
"otpSystem": "aadhaar"
}
```
**V3 Response:**
Response^
**Code: 200 OK**

```
{
"txnId": "67f12929-22fd- 4826 - a8f3-a6fef3e11244",
"message": "FACE authentication request successfully sent."
}
```
##### Step 2: Verify Face

```
This API accepts base-64 encoded face auth PID for the user which is generated by the Aadhaar RD
service application. once the PID value is successfully validated a session token is generated.
```
```
V3 URL: {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request
was initiated, ISO 8601 represents
the date and time by starting with
the year, followed by the month, the
day, the hour, the minutes, seconds,
and milliseconds
```
```
Authorization
Token
```
```
{{accesstoken}} Yes Token generated from session API
```

##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar-face-
verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
AADHAAR_FACE_VERIFY("aadhaar-face-verify"),
AADHAAR_BIO_VERIFY("aadhaar-bio-verify"),
AADHAAR_IRIS_VERIFY("aadhaar-iris-verify")
```
```
authMethods face Yes Type of login, following are the values that can be used
```
```
OTP("otp"),
PASSWORD("password"),
FACE("face"),
BIO("bio"),
IRIS("iris")
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
faceAuthPid Base 64 encoded
face auth Pid
```
```
Yes PID value is base 64 encoded which is generated by the Aadhaar RD
service application
```
**V3 Request Body:**
Request Body
{
"scope": [
"abha-login",
"aadhaar-face-verify
],
"authData": {
"authMethods": [
"face"
],
"face": {
"txnId": " _{{txnId}}_ ",
" faceAuthPid": " _{{Base- 64 - encoded_faceAuthPid}}_ "
}
}
}

**V3 Response:**


```
Response^
```
**Code: 200 OK** (^)
{
"txnId": "ec5d10f4-41c9-4d7e-b857-4a77b04a35b7",
"authResult": "success",
"message": "Face verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5ODcyNjk5MjYwIiwiY2xpZW50SWQiOiJhYmhhLXByb2ZpbGUtYXBwLWFwaSIsIn
N5c3RlbSI6IkFCSEEtTiIsIm1vYmlsZSI6Ijk4NzI2OTkyNjAiLCJ0eXAiOiJUcmFuc2ZlciIsImV4cCI6MTcwNzEyMzM2MywiaW
F0IjoxNzA3MTIzMDYzfQ.Jn9Xt0UuiVJ61-9paqnr0KWoy9T6pdc2QKQRv5qH6NlCuJcoYq-ch8JVM7xHa6CkgDvT4PZj_
",
"expiresIn": 300 ,
"accounts": [
{
"ABHANumber": "91- 5568 - 7073 - XXXX",
"preferredAbhaAddress": "nilam11@sbx",
"name": "Nilam Pratik Jadhav",
"gender": "M",
"dob": "07- 03 - 1997",
"status": "ACTIVE", "profilePhoto":
"/9j/zVr7GGNefc7jIEYzjFLKmwZNaotkU4A5qveRooztpXGY3lGe4RNu4kgBSM7j2Fen2MC29vHChJCKFyep964rSYkWc
XUzKiqQF8xwgB/vc9QCVHHfHvXbWs8dxAs0EkcsbdHjcMDjjgjrXo0YcsTgrT5pBMWWynkX7yxtjnHIFVwvlbY5BuUj589i
Rzj061dj+YlCM5JqNh56uO+CcsxBPpk4rUyZFKJ13zQHzE2fKg9Qp7e5x09acl6pco4IOSAQMjg4/MnPHtUdrJ5c/lE8HpVu
SBJTuK/OMfOOCMdOaVgRLFKrqGRgynuDmpw3FY32Sa3Km3fI3AHHB2/
/Nzz+WfNfLI/7pJbuXkbY2GxfYtyM9QcZyDRRQtQZWn03U70lprt7WLGPKt2Izxj5j/EcADnPTtWzpOnzRafJJYhZJ0lwVbM
anoQAccgBsZx1zRRTa0EpNGfFcRyXE8SRoojYkBGBG3dgY/Nf++gOatDGOKKK82vFRloelSk3HUgcYYnNRR239o38Vpn
G/JLegHU/0+poopUopyVx1JNRbQmr+bpV/aRWLRSzRAxmJskAHaQTg5BAUdcZD5ycVJBrUqS+ZqViBJtCm4tC2SA2
4Bh98KPQFs/3T0oor0kjzeZnU2ModAwmWbnKsuPmX+E8d8DH1B6dKbp7Smwg81NknlLvTH3WIyR+tFFMorz5Vgw6g1
owS70Vs+xoopMS3Eb5W9qbJFHcgFwcjIDDqAQQf59DRRSGf/9k=",
"kycVerified": true
}
] }

#### 7.5.2 Login via FingerprintAuth

##### Note : List of UIDAI-approved biometric devices


##### - https://uidai.gov.in/en/ecosystem/authentication-devices-

##### documents/biometrichttps://ind01.safelinks.protection.outlook.com/?url=https://uidai.gov.in/en/ecosystem/

authentication-devices-documents/biometric-
devices.html&data=05|02|Kushal.Pandita@ltimindtree.com|022d6e5cc5ca4c50ddc708dd93aaf31c|ff3552897
21e4dd7a663afec62ab9d54|0|0|638829084605444457|Unknown|TWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRyd
WUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ==|0|||&sdata=l/nQjzqQwmHiwJj++2

##### ueol9Tlnbz1iunxdtKxwPjPLQ=&reserved=0devices.html.(Kindly note that the list is updated by UIDAI

##### periodically.)

### Step 1: Send Biometric Verification Request

```
API accepts ABHA number and then by verifying the account will send the fingerprint verification
request to the application.
```
```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request
was initiated, ISO 8601 represents
the date and time by starting with
the year, followed by the month, the
day, the hour, the minutes, seconds,
and milliseconds
Authorization
Token
```
```
{{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar-bio-
verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
AADHAAR_FACE_VERIFY("aadhaar-face-verify"),
AADHAAR_BIO_VERIFY("aadhaar-bio-verify"),
AADHAAR_IRIS_VERIFY("aadhaar-iris-verify"),
```

```
loginHint ABHA number Yes Type of login, following are the values that can be used
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
```
loginId Encrypted ABHA
number
```
```
Yes Actual value of login type. This needs to be RSA encrypted using
public key
```
```
otpSystem aadhaar Yes Otp system to verify login, following are the values can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request body:
Request Body^
{
"scope": [
"abha-login",
"aadhaar-bio-verify"
],
"loginHint": "abha-number",
"loginId": " {{ABHA _Number Encrypted}} ",
"otpSystem": " aadhaar"
}
```
```
V3 Response:
```
Response^

**Code: 200 OK**

```
{
"txnId": "67f12929-22fd- 4826 - a8f3-a6fef3e11244",
"message": "Fingerprint authentication request successfully sent."
}
```
##### Step 2: Verify Fingerprint

```
This API accepts base-64 encoded Fingerprint auth pid for the user which is generated by the
biometric device. Once the pid value is successfully validated a session token is generated.
```
```
V3 URL: {{base_url}}/v3/profile/login/verify
```

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date
and time by starting with the year,
followed by the month, the day, the
hour, the minutes, seconds, and
milliseconds

Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar-bio-
verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("emailverify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
AADHAAR_FACE_VERIFY("aadhaar-face-verify"),
AADHAAR_BIO_VERIFY("aadhaar-bio-verify"),
AADHAAR_IRIS_VERIFY("aadhaar-iris-verify")
```
```
authMethods bio Yes Type of login, following are the values that can be used
```
```
OTP("otp"),
PASSWORD("password"),
FACE("face"),
BIO("bio"),
IRIS("iris")
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
fingerprintAuthPid Base 64 encoded
bio auth PID
```
```
Yes PID value is base 64 encoded which is generated by biometric
device
```

**Note: Checkpoints to generate fingerprintAuthPid:- lr = 'Y'; (This Attribute should
be passed as 'Y' otherwise it will give K-547 error) ra = deviceType;**

**rc = 'Y'; de = 'N'; pfr = 'N'; text = '2.5' + ra + rc + lr + de + pfr; wadh =
Base64.stringify(sha256(text)) or Convert to SHA-256 and then to base64.**

**V3 Request Body:**
Request Body
{
"scope": [
"abha-login",
"aadhaar-bio-verify
],
"authData": {
"authMethods": [
"bio"
],
"bio": {
"txnId": " _{{txnId}}_ ",
" fingerprintAuthPid ": " _{{Base- 64 - encoded_fingerprintAuthPid}}_ "
}
}
}

**V3 Response:**
Response
**Code: 200 OK**


###### {

```
"txnId": "ec5d10f4-41c9-4d7e-b857-4a77b04a35b7",
"authResult": "success",
"message": "Bio verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5ODcyNjk5MjYwIiwiY2xpZW50SWQiOiJhYmhhLXByb2ZpbGUtYXBwLWFwaSIsIn
N5c3RlbSI6IkFCSEEtTiIsIm1vYmlsZSI6Ijk4NzI2OTkyNjAiLCJ0eXAiOiJUcmFuc2ZlciIsImV4cCI6MTcwNzEyMzM2MywiaW
F0IjoxNzA3MTIzMDYzfQ.Jn9Xt0UuiVJ61-9paqnr0KWoy9T6pdc2QKQRv5qH6NlCuJcoYq-ch8JVM7xHa6CkgDvT4PZj_
",
"expiresIn": 300 ,
"accounts": [
{
"ABHANumber": "91- 5568 - 7073 - XXXX",
"preferredAbhaAddress": "nilam33@sbx",
"name": "Nilam Pratik Jadhav",
"gender": "M",
"dob": "19- 03 - 1997",
"status": "ACTIVE", "profilePhoto":
"/9j/zVr7GGNefc7jIEYzjFLKmwZNaotkU4A5qveRooztpXGY3lGe4RNu4kgBSM7j2Fen2MC29vHChJCKFyep964rSYkWc
XUzKiqQF8xwgB/vc9QCVHHfHvXbpyWs8dxAs0EkcsbdHjcMDjjgjrXo0YcsTgrT5pBMWWynkX7yxtjnHIFVwvlbY5BuUj589i
Rzj061dj+YlCM5JqNh56O+CcsxBPpk4rUyZFKJ13zQHzE2fKg9Qp7e5x09acl6pco4IOSAQMjg4/MnPHtUdrJ5c/lE8HpVu
SBJTuK/OMfOOCMdOaVgRLFKrqGRgynuDmpw3FY32Sa3Km3fI3AHHB2/
/Nzz+WfNfLI/7pJbuXkbY2GxfYtyM9QcZyDRRQtQZWn03U70lprt7WLGPKt2Izxj5j/EcADnPTtWzpOnzRafJJYhZJ0lwVbM
anoQAccgBsZx1zRRTa0EpNGfFcRyXE8SRoojYkBGBG3dgY/Nf++gOatDGOKKK82vFRloelSk3HUgcYYnNRR239o38Vpn
G/JLegHU/0+poopUopyVx1JNRbQmr+bpV/aRWLRSzRAxmJskAHaQTg5BAUdcZD5ycVJBrUqS+ZqViBJtCm4tC2SA2
4Bh98KPQFs/3T0oor0kjzeZnU2ModAwmWbnKsuPmX+E8d8DH1B6dKbp7Smwg81NknlLvTH3WIyR+tFFMorz5Vgw6g1
owS70Vs+xoopMS3Eb5W9qbJFHcgFwcjIDDqAQQf59DRRSGf/9k=",
"kycVerified": true
}
] }
```
#### 7.5.3 Login via IrisAuth

### Step 1: Send Iris verification Request

API accepts ABHA number and then by verifying the account will send the Iris verification request to
the application.

**V3 URL:** {{base_url}}/v3/profile/login/request/otp

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request
was initiated, ISO 8601 represents
the date and time by starting with
the year, followed by the month, the
day, the hour, the minutes, seconds,
and milliseconds
```

```
Authorization
Token
```
```
{{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar-irisverify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
AADHAAR_FACE_VERIFY("aadhaar-face-verify"),
AADHAAR_BIO_VERIFY("aadhaar-bio-verify"),
AADHAAR_IRIS_VERIFY("aadhaar-iris-verify"),
```
```
loginHint ABHA number Yes Type of login, following are the values that can be used
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
```
loginId Encrypted ABHA
number
```
```
Yes Actual value of login type. This needs to be RSA encrypted using
public key
```
otpSystem aadhaar Yes Otp system to verify login, following are the values can be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request body:
Request Body^
{
"scope": [
"abha-login",
"aadhaar-iris-verify"
],
"loginHint": "abha-number",
"loginId": " {{Abha_Number Encrypted}} ",
"otpSystem": " aadhaar"
}
```

```
V3 Response:
```
Response^

**Code: 200 OK**

```
{
"txnId": "67f12929-22fd- 4826 - a8f3-a6fef3e11244",
"message": "Iris authentication request successfully sent."
}
```
##### Step 2: Verify Iris

```
This API accepts base-64 encoded Iris auth PID for the user which is generated by the Iris device.
Once the PID value is successfully validated a session token is generated.
```
```
V3 URL: {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date
and time by starting with the year,
followed by the month, the day, the
hour, the minutes, seconds, and
milliseconds

Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
```

```
Scope abha-login,
aadhaar-irisverify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("emailverify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
AADHAAR_FACE_VERIFY("aadhaar-face-verify"),
AADHAAR_BIO_VERIFY("aadhaar-bio-verify"),
AADHAAR_IRIS_VERIFY("aadhaar-iris-verify")
```
```
authMethods iris Yes Type of login, following are the values that can be used
```
```
OTP("otp"),
PASSWORD("password"),
FACE("face"),
BIO("bio"),
IRIS("iris")
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
irisAuthPid Base 64 encoded
iris auth PID
```
```
Yes PID value is base 64 encoded which is generated by Iris Device
```
**V3 Request Body:**
Request Body
{
"scope": [
"abha-login",
"aadhaar-iris-verify
],
"authData": {
"authMethods": [
"iris"
],
"iris": {
"txnId": " _{{txnId}}_ ",
“irisAuthPid ": " _{{Base- 64 - encoded_irisAuthPid}}_ "
}
}
}

**V3 Response:**
Response


**Code: 200 OK**

{
"txnId": "ec5d10f4-41c9-4d7e-b857-4a77b04a35b7",
"authResult": "success",
"message": "Iris verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5ODcyNjk5MjYwIiwiY2xpZW50SWQiOiJhYmhhLXByb2ZpbGUtYXBwLWFwaSIsIn
N5c3RlbSI6IkFCSEEtTiIsIm1vYmlsZSI6Ijk4NzI2OTkyNjAiLCJ0eXAiOiJUcmFuc2ZlciIsImV4cCI6MTcwNzEyMzM2MywiaW
F0IjoxNzA3MTIzMDYzfQ.Jn9Xt0UuiVJ61-9paqnr0KWoy9T6pdc2QKQRv5qH6NlCuJcoYq-ch8JVM7xHa6CkgDvT4PZj_
",
"expiresIn": 300 ,
"accounts": [
{
"ABHANumber": "91- 5568 - 7073 - XXXX",
"preferredAbhaAddress": "nilam11@sbx",
"name": "Nilam Pratik Jadhav",
"gender": "M",
"dob": "27- 03 - 1997",
"status": "ACTIVE", "profilePhoto":
"/9j/zVr7GGNefc7jIEYzjFLKmwZNaotkU4A5qveRooztpXGY3lGe4RNu4kgBSM7j2Fen2MC29vHChJCKFyep964rSYkWc
XUzKiqQF8xwgB/vc9QCVHHfHvXbWs8dxAs0EkcsbdHjcMDjjgjrXo0YcsTgrT5pBMWWynkX7yxtjnHIFVwvlbY5BuUj589i
Rzj061dj+YlCM5JqNh56O+CcsxBPpk4rUyZFKJ13zQHzE2fKg9Qp7e5x09acl6pco4IOSAQMjg4/MnPHtUdrJ5c/lE8HpVu
SBJTuK/OMfOOCMdOaVgRLFKrqGRgynuDmpw3FY32Sa3Km3fI3AHHB2/
/Nzz+WfNfLI/7pJbuXkbY2GxfYtyM9QcZyDRRQtQZWn03U70lprt7WLGPKt2Izxj5j/EcADnPTtWzpOnzRafJJYhZJ0lwVbM
anoQAccgBsZx1zRRTa0EpNGfFcRyXE8SRoojYkBGBG3dgY/Nf++gOatDGOKKK82vFRloelSk3HUgcYYnNRR239o38Vpn
G/JLegHU/0+poopUopyVx1JNRbQmr+bpV/aRWLRSzRAxmJskAHaQTg5BAUdcZD5ycVJBrUqS+ZqViBJtCm4tC2SA2

4Bh98KPQFs/3T0oor0kjzeZnU2ModAwmWbnKsuPmX+E8d8DH1B6dKbp7Smwg81NknlLvTH3WIyR+tFFMorz5Vgw6g1
owS70Vs+xoopMS3Eb5W9qbJFHcgFwcjIDDqAQQf59DRRSGf/9k=",
"kycVerified": true
}
] }


## 7.6 Find ABHA

#### 7.6.1 Search ABHA using Mobile

#### 7.6.1.1 Search ABHA

```
V3 URL: {{base_url}}/v3/profile/account/abha/search
V3 Request: POST V3
Request Headers:
```
```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end request
transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with
the year, followed by the month, the day, the hour,
the minutes, seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
```
scope search-abha Yes Search scope
```
Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^

{
"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
{
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
"gender": "M"
```

```
" kycVerified ": " true ",
"authMethods": [
"AADHAAR_OTP",
"MOBILE_OTP",
"AADHAAR_BIO",
"DEMOGRAPHICS"
]
}
]
}
]
```
#### 7.6.1.2 Generate OTP

**V3 URL:** {{base_url}}/v3/profile/login/request/otp

**V3 Request:** POST **V3
Request Headers:**
Property Name Example Value Mandatory Description

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
mobile-verify
search-abha
```
```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint index Yes Index of ABHA number given in search API response.
```

```
loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key
```
```
otpSystem abdm Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
```
**V3 Request Body:**

```
Request Body^
```
```
{
"scope": [
"abha-login",
"search-abha",
"mobile-verify"
],
"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "abdm",
"txnId": "{{txxnId}}"
}
```
##### V3 Response:

```
Response
Code: 200 OK
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "OTP sent to mobile number ending with ******6265"
}
```
#### 7.6.1.3 Verify OTP

**V3 URL** : {{base_url}}/v3/profile/login/verify

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
scope abha-login mobile-verify Yes Defines the scope of the current action of the API
```
```
authMethods “otp” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
FACE(“face”)
BIO(“bio”)
IRIS(“iris”)
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrollment.
This chains all the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
otpValue Encrypted OTP value
Yes Otp received on mobile should be encrypted first
```
**V3 Request Body:**

```
Request Body
{
"scope": ["abha-login","mobile-verify"],
"authData": {"authMethods": ["otp"],
"otp": {
"txnId": "{{otpTxnId}}",
"otpValue": "{{rsaOtpEncryptionOutput}}"
}
}
}
```
##### V3 Response:


Response^

200 OK (^)


###### {

"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",
"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-
F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI", "expiresIn": 1800 , "refreshToken":

"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR
LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-

zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",

"refreshExpiresIn": 1296000 ,

"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",

"preferredAbhaAddress": "narayananxxx@sbx",
"name": "Narayanan Madaswamy", "status":
"ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar
1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx


```
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"
}
]
}
```
#### 7.6.2 Search ABHA using Aadhaar


#### 7.6.2.1 Search ABHA

```
V3 URL: {{base_url}}/v3/profile/account/abha/search
V3 Request: POST V3
Request Headers:
```
```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end request
transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with the
year, followed by the month, the day, the hour, the
minutes, seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
scope search-abha Yes Search scope

Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^

{
"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
{
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
```

```
"gender": "M" ,
```
```
" kycVerified ": " true ",
```
```
"authMethods":
[
"AADHAAR_OTP",
"MOBILE_OTP",
"AADHAAR_BIO",
"DEMOGRAPHICS"
]
```
###### }

###### ]

###### }

###### ]

#### 7.6.2.2 Generate OTP

```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
```
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
```

```
Scope abha-login,
aadhaar-verify
search-abha
```
```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint index Yes Index of ABHA number given in search API response.
loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
```
```
V3 Request Body:
```
```
Request Body^
```
{
"scope": [
"abha-login",
"search-abha",
"aadhaar-verify"
],
"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "aadhaar",
"txnId": "{{txxnId}}"
}

##### V3 Response:

```
Response
Code: 200 OK
```

###### {

"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "OTP sent to Aadhaar registered mobile number ending with
******6265"
}

#### 7.6.2.3 Verify OTP

```
V3 URL : {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
scope abha-login aadhaar-verify Yes Defines the scope of the current action of the API
```
```
authMethods “otp” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
FACE(“face”)
BIO(“bio”) IRIS(“iris”)
```
```
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the unique
transaction for ABHA enrollment.
This chains all the steps to enroll ABHA.
```
```
Transaction Id will be returned after a successful
OTP transaction.
otpValue Encrypted OTP value
Yes Otp received on mobile should be encrypted first
```
```
V3 Request Body:
```
Request Body^


###### {

"scope": ["abha-login","aadhaar-verify"],
"authData": {"authMethods": ["otp"],
"otp": {
"txnId": "{{otpTxnId}}",
"otpValue": "{{rsaOtpEncryptionOutput}}"
}
}
}

##### V3 Response:

```
Response^
```
200 OK (^)
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",
"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-
F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI", "expiresIn": 1800 , "refreshToken":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR
LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-
zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",
"refreshExpiresIn": 1296000 ,


"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",

"preferredAbhaAddress": "narayananxxx@sbx",
"name": "Narayanan Madaswamy", "status":
"ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar
1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx
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


```
BPA4qjZQ7sHGSe9Q3swe4WMElm7Zrd0y08tQZOCR3oerGMktx5YwcD0NUzG4k8uNyMntWreSIgPTGOoNYn2l3kKWq5bP
LdhQ0gLcggtAqLl5W6kmr8BWQD5dpA/OotP0whvMmyzHqTWtKkccOxdqg9eOaaQEIiBPKnJ6HFRyaZYXR/fwQOw6EoCarx
XLPcyKhyi/lmrCXT7yBjavXC9TQ0mAv8AYemKeLG3+mwVbgs7G0UCO2t4sn+BAM0sTuIvNkjTn7oxUlxdfZrYysAvoAOp7Clyrs
F2TLtYjYrE/TAphZS2GfJHVU7fU1UnnlitB5jEyP1GensKZHuhtS5PzNzzTsIY87XF5sRiscfAUVVuEJvVY4xjHHFPsctI7Z5zUt0mAj
8Ek+tIZJ5KlAcA4FMQnGcYI96sRNlccH6VExEc5XC880WAVtxPA69yKhaNgcnBFWlBK5zg+1RMhJIOOe9OwjNSOKxtVCr85FZt
9epBCZnGccAdyfSiinLRAGh6XJK7XlyMSSHIBHQdq3ry5js4cO30oooStG4GEBcapKBhkh6AdzW5YaVHbqG2nPvRRSir6sZpO6
xx9s9qybi4YozPxRRVMRTtBiNifvMeprVsLU8MwBFFFSgNN/LVdzkALWFdXJu9UhQAmNDuwaKKHsBamUyzpvDECn3JVIzjO
AOM0UVQEWnjJZiOCasXgymMA0UVIx1p80W7JqO8TZtcHJB5zRRTAkifI4PWo5AwOQwx6ZoooEf/2Q=="
}
]
}
```
#### 7.6.3 Search ABHA using Biometrics

#### 7.6.3.1 Search ABHA using Biometric ( Face )

#### 7.6.3.1.1 Search ABHA

```
V3 URL: {{base_url}}/v3/profile/account/abha/search
V3 Request: POST V3
Request Headers:
```
```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end request
transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with the
year, followed by the month, the day, the hour, the
minutes, seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
scope search-abha Yes Search scope

Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^


###### {

"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
{
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
"gender": "M"
" kycVerified ": " true ",
"authMethods":
[
"AADHAAR_OTP",
"MOBILE_OTP",
"AADHAAR_BIO",
"DEMOGRAPHICS"
]
}
]
}
]
```
#### 7.6.3.1.2 Generate OTP

```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
```
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API


##### V3 Body parameters:

```
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-face-verify
search-abha

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
loginHint index Yes Index of ABHA number given in search API response.

loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.

```
V3 Request Body:
```
Request Body^

{
"scope": [
"abha-login",
"search-abha",
"aadhaar-face-verify"
],
"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "aadhaar",
"txnId": "{{txxnId}}"
}

##### V3 Response:

```
Response
```
Code: 200 OK


###### {

"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "FACE authentication request successfully sent. "
}

#### 7.6.3.1.3 Verify OTP

```
V3 URL : {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
scope abha-login aadhaar-face-verify Yes Defines the scope of the current action of the API
```
```
authMethods “face” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
FACE(“face”)
BIO(“bio”)
IRIS(“iris”)
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrollment. This
chains all the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
faceAuthPid Generated FaceAuthPid Value^ Yes^ Face auth pid can be generated from the Biometric
systems
```
```
V3 Request Body:
```
Request Body^


###### {

"scope": ["abha-login","aadhaar-face-verify"],
"authData": {"authMethods": ["face"],
"face": {
"txnId": "{{otpTxnId}}",
"faceAuthPid": "{{faceAuthPid}}"
}
}
}

##### V3 Response:

```
Response
200 OK
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",
"message": "FACE verified successfully ", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-
F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI",
"expiresIn": 1800 ,
```


"refreshToken":

"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR
LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-

zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",

"refreshExpiresIn": 1296000 ,

"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",
"preferredAbhaAddress": "narayananxxx@sbx",
"name": "Narayanan Madaswamy", "status":
"ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar
1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx
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


```
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"
}
]
}
```
#### 7.6.3.2 Search ABHA using Biometric ( Fingerprint )

##### Note : List of UIDAI-approved biometric devices

##### - https://uidai.gov.in/en/ecosystem/authentication-devices-

##### documents/biometrichttps://ind01.safelinks.protection.outlook.com/?url=https://uidai.gov.in/en/ecosystem/

authentication-devices-documents/biometric-
devices.html&data=05|02|Kushal.Pandita@ltimindtree.com|022d6e5cc5ca4c50ddc708dd93aaf31c|ff3552897
21e4dd7a663afec62ab9d54|0|0|638829084605444457|Unknown|TWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRyd
WUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ==|0|||&sdata=l/nQjzqQwmHiwJj++2

##### ueol9Tlnbz1iunxdtKxwPjPLQ=&reserved=0devices.html.(Kindly note that the list is updated by UIDAI

##### periodically.)

#### 7.6.3.2.1 Search ABHA

```
V3 URL: {{base_url}}/v3/profile/account/abha/search
V3 Request: POST V3
Request Headers:
```
```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end request
transaction
```

TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with the
year, followed by the month, the day, the hour, the
minutes, seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
scope search-abha Yes Search scope

Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^

{
"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
{
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
"gender": "M" ,
" kycVerified ": " true ",
"authMethods":
[
"AADHAAR_OTP",
"MOBILE_OTP",
"AADHAAR_BIO",
"DEMOGRAPHICS"
]
}
]
}
]
```

#### 7.6.3.2.2 Generate OTP

```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
```
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-bio-verify
search-abha

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
```
AADHAAR_VERIFY("aadhaar-verify"),^
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),

loginHint index Yes Index of ABHA number given in search API response.

loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.

```
V3 Request Body:
```
Request Body^


###### {

```
"scope": [
"abha-login",
"search-abha",
"aadhaar-bio-verify"
],
"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "aadhaar",
"txnId": "{{txxnId}}"
}
```
##### V3 Response:

```
Response^
```
Code: 200 OK (^)
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "Fingerprint authentication request successfully sent. "
}

#### 7.6.3.2.3 Verify OTP

```
V3 URL : {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
scope abha-login aadhaar-bio-verify Yes Defines the scope of the current action of the API
```

```
authMethods “bio” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
FACE(“face”)
BIO(“bio”)
IRIS(“iris”)
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrollment. This
chains all the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
fingerPrintAuthPid Generated Fingerprint AuthPid
Value
```
```
Yes Fingerprint auth pid can be generated from the
Biometric systems
```
```
V3 Request Body:
```
Request Body^

{
"scope": ["abha-login","aadhaar-bio-verify"],
"authData": {"authMethods": ["bio”],
"bio": {
"txnId": "{{otpTxnId}}",
"fingerPrintAuthPid": "{{fingerPrintAuthPid}}"
}
}
}

##### V3 Response:

```
Response
200 OK
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",
"message": "BIO verified successfully ", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
```


QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-
F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI", "expiresIn": 1800 , "refreshToken":

"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR
LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-

zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",

"refreshExpiresIn": 1296000 ,

"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",
"preferredAbhaAddress": "narayananxxx@sbx",
"name": "Narayanan Madaswamy", "status":
"ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar
1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx
Gz3jSoTtKv29+lehaL4nTUMJIMEgfMRjB759vf3rxNZACDjmtSx1a4snDRu20NuKk0nED32Mh1BU5GM5qXGK5Twh4pg1mP
7K6mO7ReV5wwHGRn+VdeF4rN6CI8e1AqXbmkK47UANC0bakC0u2i4HmMn3jUdPmyJDxTBSGLS0lGaAIrq4S2geWRgqK
MkmvPNW1P7fdM6AiIcKD1rd8Xagu1bJHOeGfB/IVx7cn5fxqorqAE/NmlwD3ojjaRtqjn1rQi01m6559Ku41FsoBSTtBOB60w
xsPcV0cGkqpUsefpVoaZGw5QAdqTki1TZy0YkXkA4pxXkHOcV1Uelx7vmUY+lTDRosHCcH2p3D2bOVUjB7U4S4PA5rTu9HaB
iyDI9Ky8MmVIwfcUyGmtzV0/UpbW5SRZHjbPLISDjvzXsPhrxZYajCYTOyyq2AJW5Yex714TuKnJzVy3lyC245FS1cR9LDDDjmlx
XJ/D7Vm1HQfJllLz2zbG3HJ2nkH+Y/CuurMQm2lxSqOaftoA8suhiSq9X79Nrk1n0MYtI7bVJoprjK4oA821NzPdyuzZYsTms9AX
cIOpOK2NcjSG+dBnb165qnpNv5lxvI4FaLYaVzTtLJYkHc9zWnFEBiokGOMVct4yT0qZHRBFiKIHGRVvyl2AYpI1KKBU689qzNBi
QAHmrJiUR8DmmqpJ4FSmM7a0iSzNnjGTms65tI5hyozWxNGTkVUMRNAnqchc27W+4HkZ4pIFIA4wvrW5qlurxkEYPUVkR
s20IvKA9PWtEc8lZne/DiaWDW1SNvkmRg6no2ASK9fAyK8v8AAMa3t5A8ccUP2RckA5Lkjbn9TXqK5xzWUtyBQKWilqQPMt
RYFjWYTV/UM+ZWfjFNjDNLSGjOOKAOE8TwGG/bIO1yWU/WnaVEIrMzNgA1seKrdZrHzgw3RdvYkVl2kfnaXbpnA5z+Zq09C
o7if2hEjHmrdrrGXAERwO+aIdDhkOGUc9wa0YtFs0j4mU47bqdl1NfeLtncLd9FwavrF6DNYsNxFYyBAygHoQa1rO8jeXazZX2
qHY0V+pDdPNbnciZz61mnXLpGKtCp5xgZro7uaIpwAynoKw5760VsMgIB5G3NWmiJKQwasZT/AKps+wqOO/YPiRCVJ4IrVs9
S0x4cK6qc4C7lB/LOac6W8xyu049etEmrCSfco3NulxavgckcGuRIMdwQO1d0sWxcDp9a5PUbfy72VOh3ZHHY0oEVEdr8M4


3k1x5Qfl+zsSFPGdyj/wCv+FetjpXNeB9Jj03w3aMi/PPGsrN655H866cCpk9TIAKXFKBTttSB5hqqhCSeKwpLyJScsK3dXjLqxNc
bOpVyDRJ2KSuXZNSjX7oJNU5r+WTgfKPaqxpuOam7KsMnBmiZWJORikgt2jsUCj7o7/WnnpTpEeSJFXOCKuBcUVoA89wVu2


```
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"
}
]
}
```
#### 7.6.3.3 Search ABHA using Biometric (IRIS)

#### 7.6.3.3.1 Search ABHA

```
V3 URL: {{base_url}}/v3/profile/account/abha/search
V3 Request: POST V3
Request Headers:
```
```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

```
Yes Unique UUID for tracking the end-to-end request
transaction
```

TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with the
year, followed by the month, the day, the hour, the
minutes, seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
scope search-abha Yes Search scope

Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^

{
"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
{
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
"gender": "M"
" kycVerified ": " true ",
"authMethods":
[
"AADHAAR_OTP",
"MOBILE_OTP",
"AADHAAR_BIO",
"DEMOGRAPHICS"
]
}
]
}
]
```

#### 7.6.3.3.2 Generate OTP

```
V3 URL: {{base_url}}/v3/profile/login/request/otp V3 Request: POST V3 Request Headers:
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar-iris-verify
search-abha
```
```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint index Yes Index of ABHA number given in search API response.
loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
```
```
V3 Request Body:
```
```
Request Body^
```
{
"scope": [
"abha-login",
"search-abha",
"aadhaar-iris-verify"
],


"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "aadhaar",
"txnId": "{{txxnId}}"
}

##### V3 Response:

```
Response
Code: 200 OK
```
```
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "IRIS authentication request successfully sent. "
}
```
#### 7.6.3.3.3 Verify OTP

```
V3 URL : {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
scope abha-login aadhaar-iris-verify Yes Defines the scope of the current action of the API
```

```
authMethods “iris” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
FACE(“face”)
BIO(“bio”) IRIS(“iris”)
```
```
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the unique
transaction for ABHA enrollment. This chains all
the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
irisAuthPid Generated Iris AuthPid Value^ Yes^ Iris auth pid can be generated from the Biometric
systems
```
```
V3 Request Body:
```
Request Body^

{
"scope": ["abha-login","aadhaar-iris-verify"],
"authData": {"authMethods": ["iris”],
"iris": {
"txnId": "{{otpTxnId}}",
"irisAuthPid": "{{irisAuthPid}}"
}
}

}

##### V3 Response:

```
Response^
```
200 OK (^)


###### {

"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",
"message": "IRIS verified successfully ", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-
F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI", "expiresIn": 1800 , "refreshToken":

"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR
LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-

zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",

"refreshExpiresIn": 1296000 ,

"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",
"preferredAbhaAddress": "narayananxxx@sbx",
"name": "Narayanan Madaswamy", "status":
"ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar


1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx
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"
}
]
}


## 8.0 Update Profile

### 8.1 Update Mobile

### Step 1: Generate OTP

```
This API will generate OTP on provided encrypted mobile number.
```
```
V3 URL: {{base_url}}/v3 /profile/account/request/otp
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property
Name
```
```
Value^ Mandatory^ Description^
```
```
Scope abha-profile
mobile-verify
```
```
Yes Defines the scope of the current action of the
API
```
```
loginHint mobile Yes Type of login
```
```
loginId Mobile Yes Actual value of login type. This needs to be
RSA encrypted using a Public key
```
```
otpSystem abdm Yes Otp system to verify hiu/hip/phr login
```
```
V3 Request Body:
```
Request Body^


###### {

```
"scope": [
"abha-profile",
"mobile-verify"
],
"loginHint": "mobile",
"loginId": " {{Mobile_encryption}} ",
"otpSystem": "abdm"
}
```
**V3 Response:**
Response

```
Code: 200 OK
```
```
{
"txnId": "1234567890:20211216223812",
"message": "OTP sent to mobile number ending with ******2418"
}
```
##### Step 2: Verify Mobile OTP

**V3 URL:** {{base_url}}/v3/profile/account/verify

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Value Mandatory Description
```

Scope (^) abha-profile mobile-
verify
Yes Defines the scope of the current action of
the API
authMethod otp Method of verification
timestapm Actual time, format: "YYYY-MM-DD HH:mm:ss" Yes (^)
txnId txnId Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrolment. This
chains all the steps to enrol in ABHA.
Transaction Id will be returned after a
successful OTP transaction.
otpValue Encrypted otpValue Yes Otp system to verify hiu/hip/phr login
**V3 Request Body:**
Response^
Code: 200 OK (^)
{
"scope": [
"abha-profile",
"mobile-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": "{{txnId}}",
"otpValue": "{{OTP_encryption}}"
}
}
}
**V3 Response:**
Response^
Code: 200 OK (^)


###### {

```
"txnId": "01bb3a4c- 4588 - 4734 - aff4-23d3978e50be",
"authResult": "success",
"message": "Mobile Number linked successfully",
"accounts": [
{
"ABHANumber": " 91 - 4173 - 3253 - XXXX"
}
]
}
```
### 8.2 Update Email

```
V3 URL: {{base_url}} /abha/api/v3/profile/account/request/emailVerificationLink
```
##### V3 Request: POST

##### V3 Header Parameters:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-xtoken after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Value Mandatory Description
txnId txnId Yes Transaction Id is Mandatory to identify
the unique transaction for ABHA
enrollment. This chains all the steps to
enroll in ABHA. Transaction Id will be
returned after a successful OTP
transaction.
```
```
Scope abha-profile email-link-verify Yes Defines the scope of the current action
of the API
loginHint email Yes Type of login
```

```
loginId Encrypted Email Yes Actual value of login type. This needs to
be RSA encrypted using a Public key
```
```
otpSystem abdm Yes Otp system to verify hiu/hip/phr login
```
##### V3 Request Body:

```
Request Body
{
"scope": [
"abha-profile",
"email-link-verify"
],
"loginHint": "email",
"loginId":
"pb2Rf4GQ3zq5rIxXWgpn8Td9HMh0sjlb/SbN+6CHpylD422FxcJPHgo9Zyc3SES5etu60JFga4729tdi4BPU0mW053M6d2kC3E
W8cd917VNP0hett79+S80JG6VdWYsb3pzF3G7GoGaCEqcmr6pt5ZX2NNkN9YT5f9QXqSUkrNAm9/RJVUzUy+KuXo0MbV35
nOU6IO5Bs8Bly+Ggs96kogiTf8iajIxheoO02nVU1Ln6Q9rjgLFI1ibyEJ5/wvOp8FvSA3Ed8+CodQpkWeiJbRFokZCMHx9ONlIO8
Zbr0brbCGQsZkfqOjRZswgS8vV3lJded1Vx7qY3bqb/QWZSYLWgXN61TFU4EZ/vq1jix0YasIuuxjijWUzTV43qDL/AJPKLnsOhGis
1G+quo7WKzTCAAEkjbEEApZNrZL5RYcn3gykXfbNJaSu82tHO4Bke9uXc6ON91QcAhNHeOJFc3zPvftCQu59YYunuiaM3YmX
MCeVtaOYyaO1mLd+OEDCrWTeEyPZCkRf32W0TXjhoTN7UcC+t94hWWv2dAahbVzpMiS+NXVoAMj66/l/7wbUqsem/aK+3j
/tveftXJTyREg7/wjHWBrjUdt8hMFsbinsYs+S7Bpus65Oafqrost5MDdxlu+0g8C3ce0EUDF76sklA1S885gN3KMsqk5cC9hY=",
"otpSystem": "abdm"
}
```
##### V3 Response:

```
Response
Code: 200 OK
No response
```
### 8.3 Delete/Deactivate ABHA Number

#### 8.3.1 Delete ABHA Via Aadhaar

### Step 1: Send OTP

**V3 URL:** {{base_url}}/v3 /profile/account/request/otp

##### V3 Request: POST

##### V3 Header Parameters:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Value Mandatory Description
Scope abha-profile, delete
Yes Defines the scope of the current
action of the API. de-activate/delete
```
```
loginHint abha-number Yes Type of login
loginId Encrypted abha number Yes Actual value of login type. This
needs to be RSA encrypted using a
public key
```
```
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr
login, following are the values that
can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
```
Request Body^

###### {

```
"scope": [
"abha-profile",
"delete"
],
"loginHint": "abha-number",
"loginId": "{{AbhaNumber_encryption}}",
"otpSystem": "aadhaar"
}
```
```
V3 Response:
```

```
Response
Code: 200 OK
```
```
{
"txnId": "3917ca6b-1b3a-46a1-b99a-248e925929ff",
"message": "OTP sent to mobile number ending with ******4723"
}
```
### Step 2: Verify OTP

```
V3 URL: {{base_url}}/v3/profile/account/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Value Mandatory Description
```
```
Scope Abha-profile delete Yes Defines the scope of the current action of the
API
authMethod otp Method of verification
```
Timestamp Actual time, format : "YYYY-MM-DD HH:mm:ss" Yes (^)
txnId txnId Yes Transaction Id is Mandatory to identify the unique
transaction for ABHA enrollment. This chains all
the steps to enroll in ABHA.
Transaction Id will be returned after a successful
OTP transaction.


otpValue Encrypted OTP Value Yes Otp system to verify hiu/hip/phr login

```
V3 Request Body:
```
Request Body^

```
{
"scope": [
"abha-profile",
"delete"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " {{txnId}} ",
"otpValue": " {{OTP_encryption}} "
}
}
}
```
```
V3 Response:
Response^
```
Code: 200 OK (^)
{
"txnId": "890f35c9-a9d5-4db5-861c-d27c17bd37f5",
"authResult": "success",
"message": "Your account has been deleted",
"accounts": [
{
"ABHANumber": " 91 - 8434 - 1243 - XXXX"
}
]
}

#### 8.3.2 Delete ABHA Via ABHA OTP

### Step 1: Send OTP.

```
V3 URL: {{base_url}}/v3 /profile/account/request/otp
V3 Request: POST V3
Header Parameters:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Value Mandatory Description
Scope abha-profile, delete
Yes Defines the scope of the current
action of the API. de-activate/delete
```
```
loginHint abha-number Yes Type of login
loginId Encrypted abha number Yes Actual value of login type. This
needs to be RSA encrypted using a
public key
```
```
otpSystem abdm Yes Otp system to verify hiu/hip/phr
login, following are the values that
can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
##### V3 Request Body:

Request Body^

###### {

```
"scope": [
"abha-profile",
"delete"
],
"loginHint": "abha-number",
"loginId": "{{AbhaNumber_encryption}}",
"otpSystem": "abdm"
}
```

##### V3 Response:

```
Response
Code: 200 OK
```
```
{
"txnId": "3917ca6b-1b3a-46a1-b99a-248e925929ff",
"message": "OTP sent to mobile number ending with ******4723"
}
```
### Step 2: Verify OTP

##### V3 URL: {{base_url}}/v3/profile/account/verify V3

##### Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Value Mandatory Description
```
```
Scope abha-profile delete Yes Defines the scope of the current action of the
API
authMethod otp Method of verification
```
Timestamp Actual time, format : "YYYY-MM-DD HH:mm:ss" Yes (^)
txnId txnId Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA profile.


otpValue Encrypted OTP Value Yes (^) Otp system to verify hiu/hip/phr login,
following are the values that can be used.
AADHAAR("aadhaar"),
ABDM("abdm"),

##### V3 Request Body:

Request Body^

```
{
"scope": [
"abha-profile",
"delete"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " {{txnId}} ",
"otpValue": " {{OTP_encryption}} "
}
}
}
```
##### V3 Response:

```
Response^
```
Code: 200 OK (^)
{
"txnId": "890f35c9-a9d5-4db5-861c-d27c17bd37f5",
"authResult": "success",
"message": "Your account has been deleted",
"accounts": [
{
"ABHANumber": " 91 - 8434 - 1243 - XXXX"
}
]
}

#### 8.3.3 Delete ABHA Via Password

### Step 1: Verify Password.

```
V3 URL: {{base_url}}/v3/profile/account/verify
```
```
V3 Request: POST
```
```
V3 Header Parameters:
```

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters:**
Property Name Value Mandatory Description
Scope abha-profile, delete
Yes Defines the scope of the current
action of the API. delete

```
authData authmethods Yes Type of authentication method
```
```
password
```
reasons yes (^)
**V3 Request Body:**
Request Body
{
"scope": [
"abha-profile",
"delete"
],
"authData": {
"authMethods": [
"password"
],
"password": {
"password":
"aEfgH6qnADmgcJHbxPvbnJuPsiocA5XHvg4uYWFOF6g/6ga+yQAKzVMQZoY31vdr367g3aXu9nbCiYiTH9kLYuU3JrnYb29jV7aGEa6ek4IuXG9
jakddYDlhkqOdrgX4taTCWP+bv2smyTbWW0N5d5SuIOtO41ZEhvQlJtJYp6008TE5DE/Hcr25MI4p49mzG9oNUQC7ONwDfyhI9sRjRZ1M4oh
p7M4+tZAKiS8qSYGVG2bUuraH9+3VMRWXerumyObI3q9vIcbhF0oXMkseIJaOTDkVGrRbBYL8LaBeJ48p+XYX6wDds83i2O/C4pL4TFE+XCuk
mjTfrPXuaWi8qs80kFfL6Gmikp+MJjm6HXy9pzfb1pAnGn+qPUmqdiVAhedn2vdPjsLDRM6jn+l34RCri/0ePNNbhMQRVVGXKuDTZUWmAq0S
xcUb+Wnc0qMgIUrSjVREaag2EcllqWfXV77ZkQgTVgQblTdSbdKXFclRq9/3AE6IqwlwFe1/6x6t3bVlWL575VeqyazUfkOCu5R44CBsKE8LNXtaZ
Yac5zxc2w5Ee6UlcG2726RaY6XWNiSJ+CZacMM8/8zlcYEZMTZfRmxbnKgm6BcQ+j7HH9pUpmxK/57gIFnVbgGsFG1nbcuz+5Fazd1B96O8ws
9qfdwgrmr8RgADY64ROfElZ0M="
}
},
"reasons": [
"aaaaa",
"bbbb"
]


###### }

**V3 Response:**
Response
Code: 200 OK

```
{
"authResult": "success",
"message": "Your account has been deleted.",
"accounts": [
{
"ABHANumber": "91- 5555 - 0357 - XXXX"
}
]
}
```
### 8.4 Deactivate ABHA Number

#### 8.4.1 Deactivate ABHA Via Aadhaar

### Step 1: Send OTP.

**V3 URL:** {{base_url}}/v3 /profile/account/request/otp
**V3 Request:** POST

**V3 Header Parameters:**
Property Name Example Value Mandatory Description

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters:**
Property Name Value Mandatory Description


```
txnId Empty No Transaction Id is Mandatory to
identify the unique transaction for
ABHA de-activate.
```
```
Scope abha-profile, de-activate
Yes Defines the scope of the current
action of the API. de-activate/delete
```
```
loginHint abha-number Yes Type of login
loginId Encrypted abha number Yes Actual value of login type. This
needs to be RSA encrypted using a
public key
```
```
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr
login, following are the values that
can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
```
Request Body^

###### {

```
"scope": [
"abha-profile",
"de-activate"
],
"loginHint": "abha-number",
"loginId": "{{AbhaNumber_encryption}}",
"otpSystem": "aadhaar"
}
```
```
V3 Response:
Response
```
```
Code: 200 OK
```
```
{
"txnId": "3917ca6b-1b3a-46a1-b99a-248e925929ff",
"message": "OTP sent to mobile number ending with ******4723"
}
```
### Step 2: Verify OTP

```
V3 URL: {{base_url}}/v3/profile/account/verify
```

```
V3 Request: POST
```
```
V3 Request Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Value Mandatory Description
```
```
Scope abha-profile, de-activate Yes Defines the scope of the current action of the
API
authMethod otp Method of verification
```
Timestamp Actual time, format : "YYYY-MM-DD HH:mm:ss" Yes (^)
txnId txnId Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrollment. This
chains all the steps to enroll in ABHA.
Transaction Id will be returned after a successful
OTP transaction.
otpValue Encrypted OTP Value Yes (^) Otp system to verify hiu/hip/phr login,
following are the values that can be used.
AADHAAR("aadhaar"),
ABDM("abdm"),
reasons Yes (^)
**V3 Request Body:**
Request Body^


###### {

```
"scope": [
"abha-profile",
"de-activate"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " {{txnId}} ",
"otpValue": " {{OTP_encryption}} "
}
},
"reasons": ["aaaaa","bbbb"]
}
```
```
V3 Response:
Response^
```
Code: 200 OK (^)
{ "^ txnId": "890f35c9-a9d5-4db5-861c-d27c17bd37f5",
"authResult": "success",
"message": "Your account has been de-activated",
"accounts": [
{
"ABHANumber": " 91 - 8434 - 1243 - XXXX"
}
]
}

#### 8.4.2 Deactivate ABHA Via ABHA OTP

### Step 1: Send OTP.

```
V3 URL: {{base_url}}/v3/profile/account/request/otp
```
```
V3 Request: POST
V3 Header Parameters:
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```

```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Value Mandatory Description
txnId Empty No Transaction Id is Mandatory to
identify the unique transaction for
ABHA deactivatation.
```
```
Scope abha-profile, deactivate
Yes Defines the scope of the current
action of the API. de-activate/delete
```
```
loginHint Abha-number Yes Type of login
loginId Encrypted abha number Yes Actual value of login type. This
needs to be RSA encrypted using a
public key
```
```
otpSystem abdm Yes Otp system to verify hiu/hip/phr
login, following are the values that
can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
```
Request Body^

###### {

```
"scope": [
"abha-profile",
"de-activate"
],
"loginHint": "abha-number",
"loginId": "{{AbhaNumber_encryption}}",
"otpSystem": "abdm"
}
```
```
V3 Response:
Response
Code: 200 OK
```

###### {

```
"txnId": "3917ca6b-1b3a-46a1-b99a-248e925929ff",
"message": "OTP sent to mobile number ending with ******4723"
}
```
### Step 2: Verify OTP

**V3 URL:** {{base_url}}/v3/profile/account/verify

**V3 Request:** POST

**V3 Request Headers:**
Property Name Example Value Mandatory Description

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters:**
Property Name Value Mandatory Description

```
Scope Abha-profile de-activate Yes Defines the scope of the current action of the
API
authMethod otp Method of verification
```
Timestamp Actual time, format : "YYYY-MM-DD HH:mm:ss" Yes (^)
txnId txnId Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrollment. This
chains all the steps to enroll in ABHA.
Transaction Id will be returned after a successful
OTP transaction.


otpValue Encrypted OTP Value Yes (^) Otp system to verify hiu/hip/phr login,
following are the values that can be used.
AADHAAR("aadhaar"),
ABDM("abdm")
reasons Yes (^)
**V3 Request Body:**
Request Body^
{
"scope": [
"abha-profile",
"de-activate"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " _{{txnId}}_ ",
"otpValue": " _{{OTP_encryption}}_ "
}
},
"reasons":["aaaaa","bbbb"]
}
**V3 Response:**
Response^
Code: 200 OK (^)
{ "^ txnId": "890f35c9-a9d5-4db5-861c-d27c17bd37f5",
"authResult": "success",
"message": "Your account has been de-activated",
"accounts": [
{
"ABHANumber": " 91 - 8434 - 1243 - Xxxx"
}
]
}

#### 8.4.3 Deactivate ABHA Via Password.................................................................................................

### Verify Password.

```
V3 URL: {{base_url}}/profile/account/verify
V3 Request: POST
```
```
V3 Header Parameters:
```

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters:**
Property Name Value Mandatory Description
Scope abha-profile, de-activate
Yes Defines the scope of the current
action of the API. de-activate/delete

```
authData authmethods Yes Type of authentication method
```
```
password
```
reasons yes (^)
**V3 Request Body:**
Request Body
{
"scope": [
"abha-profile",
"de-activate"
],
"authData": {
"authMethods": [
"password"
],
"password": {
"password":
"aEfgH6qnADmgcJHbxPvbnJuPsiocA5XHvg4uYWFOF6g/6ga+yQAKzVMQZoY31vdr367g3aXu9nbCiYiTH9kLYuU3JrnYb29jV7aGEa6ek4IuXG9
jakddYDlhkqOdrgX4taTCWP+bv2smyTbWW0N5d5SuIOtO41ZEhvQlJtJYp6008TE5DE/Hcr25MI4p49mzG9oNUQC7ONwDfyhI9sRjRZ1M4oh
p7M4+tZAKiS8qSYGVG2bUuraH9+3VMRWXerumyObI3q9vIcbhF0oXMkseIJaOTDkVGrRbBYL8LaBeJ48p+XYX6wDds83i2O/C4pL4TFE+XCuk
mjTfrPXuaWi8qs80kFfL6Gmikp+MJjm6HXy9pzfb1pAnGn+qPUmqdiVAhedn2vdPjsLDRM6jn+l34RCri/0ePNNbhMQRVVGXKuDTZUWmAq0S
xcUb+Wnc0qMgIUrSjVREaag2EcllqWfXV77ZkQgTVgQblTdSbdKXFclRq9/3AE6IqwlwFe1/6x6t3bVlWL575VeqyazUfkOCu5R44CBsKE8LNXtaZ
Yac5zxc2w5Ee6UlcG2726RaY6XWNiSJ+CZacMM8/8zlcYEZMTZfRmxbnKgm6BcQ+j7HH9pUpmxK/57gIFnVbgGsFG1nbcuz+5Fazd1B96O8ws
9qfdwgrmr8RgADY64ROfElZ0M="
}
},
"reasons": [
"aaaaa",
"bbbb"


###### ]

###### }

**V3 Response:**
Response

```
Code: 200 OK
```
```
{
"authResult": "success",
"message": " Your account has been de-activate"
"accounts": [
{
"ABHANumber": " 91 - 5555 - 0357 - XXXX"
}
]
}
```
### 8.5 Re-activate ABHA Number

### Step 1: Send OTP.

**V3 URL:** {{base_url}}/v3 /profile/account/request/otp
**V3 Request:** POST

**V3 Header Parameters:**
Property Name Example Value Mandatory Description

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters:**
Property Name Value Mandatory Description
txnId Empty No Transaction Id is Mandatory to
identify the unique transaction for
ABHA reactivation.


```
Scope abha-login mobile-
verify, re-activate
```
```
Yes Defines the scope of the current
action of the API.
```
```
loginHint abha-number Yes Type of login
loginId Encrypted abha number Yes Actual value of login type. This
needs to be RSA encrypted using a
public key
```
```
otpSystem abdm Yes Otp system to verify hiu/hip/phr
login, following are the values that
can be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
```
Request Body^

###### {

```
"scope": [
"abha-login",
"mobile-verify",
"re-activate"
],
"loginHint": "abha-number",
"loginId": "{{AbhaNumber_encryption}}",
"otpSystem": "abdm"
}
```
```
V3 Response:
```
Response (^)
Code: 200 OK
{
"txnId": "3917ca6b-1b3a-46a1-b99a-248e925929ff", "message": "OTP sent to mobile number ending with ******4723"
}

### Step 2: Verify OTP

```
V3 URL: {{base_url}}/v3/profile/login/verify
V3 Request: POST
```
```
V3 Request Headers:
```

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters:**
Property Name Value Mandatory Description

Scope (^) abha-login mobile-
verify, re-activate
Yes Defines the scope of the current action of the
API
authMethod otp Method of verification
Timestamp Actual time, format : "YYYY-MM-DD HH:mm:ss" Yes (^)
txnId txnId Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA re-activation.
otpValue Encrypted OTP Value Yes Otp system to verify hiu/hip/phr login
**V3 Request Body:**
Request Body
{
"scope": [
"abha-login",
"mobile-verify",
"re-activate"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": "{{txnId}}",
"otpValue": "{{OTP_encryption}}"
}


###### }

###### }

**V3 Response:**
Response
Code: 200 OK

```
{
"txnId": "27772bb0-cc0b-460b-8c8f-a940bec9b1fb",
"authResult": "success",
"message": "You have successfully reactivated the account",
"token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS03MzQ4LTEyNDMtODQzNCIsImNsaWVudElkIj
oiYWJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJtb2JpbGUiOiI5ODE4NTU0NzIzIiwiYWJoYU51bWJl
ciI6IjkxLTczNDgtMTI0My04NDM0IiwicHJlZmVycmVkQWJoYUFkZHJlc3MiOm51bGwsInR5cCI6IlRyYW5zYWN0aW9uIiwiZX
hwIjoxNzEwNDEyMjkyLCJpYXQiOjE3MTA0MTA0OTIsInR4bklkIjorPG6AAy6ek37xyRiRAXMRdstFMZxKgU4x5H6PYl9LCAD
UhS4PvqeCa3bhtOjH_WtiFJqVaJ2GHRNdYJ38qZlDGYBzuhLo1OhNDtow3AnZnIUZs2fPzgXicKDLGdjFIaOcF9nkTjzHYAemN
RFhK9B8kYXq_mkl0zaBMpO9nWYAnlNFNGhXtC72OGx2MEKJt22Qn-Fzh2BPsI6lgPv9R7lWHhmU",
"expiresIn": 1800 , "refreshToken":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS03MzQ4LTEyNDMtODQzNCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0Z
W0iOiJBQkhBLU4iLCJ0ecNAIe0PuVYPhrsUmWTmlCSdISedLwsoJUZ3HGHpgi5xW_NWUQvYRVgUaTnZSKsxKd2bsmNqUcv4QbEupzut7uoBc
g5i6RmpiOdHAyvoQCgDOlWlns1CYpM2Ic0YjgpbMVZnSD_isHiuN5hhbg7K3V9Ugyl75CI9Fk7tJCGtrztILmsq7dCF_sZURwxtoMzz7tgW6hP84
F_w7623ucNQLkIh25ii_z6_kYguuXSiISTPbQ4YVGSvWajbMLCEZ5rhc0WhWicmA8_ZVORNbJm4RHIJgaXOogbP6zj9no9sxIH9RPZdxDnecigV
uTioMTFcVbDz1vZWuzBrs7X P4dZTzjVBqN7FHn8",
"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": " 91 - 8434 - 2367 - XXXX",
"preferredAbhaAddress": "jaiswalxx@sbx",
"name": "Praveen Kumar Jaiswal",
"status": "ACTIVE",
"profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/LAwSH88yfrUGAIV0nTMgpF5by9Mfu5Ixz7GJaKKlibLkiyWvmSQX/AJrL5kvlMQdw/eOAPxmi/IVW1KZr
sy6dZBl4dGIGAAVmQfrGKKKlajuW4jHa3cdra8zSThyfQGZGb9Js1ryadbWGjxT6lP59zHAHMatjdIkcbZ/76tGP5+tFFDWo0Psw0d+Jmi8s+ZKm
D2CyxRj9IwfoKvPcKxUyqHCSB13cjg7xz9VU/hRRU7oR/9k="
}
]
}
```
### 8.6 Re-KYC

This API used to provide Re-KYC Facility.

**Step 1: Generate OTP
V3 URL:** {{base_url}}/v3/profile/account/request/otp

**V3 Request:** POST **V3
Request Headers:**
Property Name Example Value Mandatory Description


```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
scope abha-profile rekyc Yes abha-profile and re-kyc
```
```
loginHint abha-number Yes Login Hint for re-kyc
```
```
loginId
Encrypted abha number No Encrypted abha number for re-kyc
```
```
otp-system aadhaar Yes Select option for Otp system
```
**V3 Request Body:**
Request Body
{
"scope": [
"abha-profile",
"re-kyc"
],
"loginHint": "abha-number",
"loginId":
"nJ3WR5UmFR+v2sNXBfgxWQHWDgjja5OFVlJWnmf6lzyjdfxcLiHMkzmtBPmzBRL+4PzDXp+TXlXNSSE4BBmEL6/OzWiVoEJphCwhHdHH9Vx
SBguYVZ9dLBbK0ntzgsxmacjABNXLg/H1RKio/au7iPCW67tKDfMUXGorZ29HSaQosu86GqC7/nPFxBD97mEXd6vgl9PmREWolywWesJxvBnX
mV4Is+73sgAXGM6KZmRyaSH7T/JeknqyWDYdJLeUvoHLf+nTzYykCZS9Ej/1ue3RJWf7NRAxpy+n9a+Ce38n2P2OwoJCU6MEWK3sRSG6zVSH
NXFAFre+wme+17ZNcQChE1btboTaPFlIqecD39vHmiZoO7vlhVIzJKo0oJesP05P1RM7N+piO1m3GXgQGp8rupBFb7Vhw+ueei6ajLHf+Gf6YEI
NK6fKcVUgPQtwMrBi+VzIQxok3pAEBJthTXisOf5YCldymGFlfflSPrmyWWJabhP1+f4O+gkxLcZyGLzCnpFd++WPTjdTP7NPtSKqNq2CbFpqoLK
3cP8/xAj4aj5/1wh5jYkjWA6hJn6rYKDCCXVoZO9kT5RDBj52IWOy2KIwWmb9RGVWdrRwD1/Ekdnx3uYEnk/acKTMUYW3UvVPGhxOTKLkwj
bWEhrnvMG6x4jzMH+2b8GvdLbQYgk=",
"otpSystem": "aadhaar"
}

```
V3 Response:
```
Response (^)
**Code: 200 OK**


###### {

"txnId": "99acc695-5b1c-47ee-8ce1-ee55c004978e",
"message": "OTP sent to Aadhaar registered mobile number ending with ******5856"
}

```
Step 2: Verify OTP
```
```
V3 URL: {{base_url}}/v3/profile/account/verify
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
scope abha-profile rekyc Yes abha-profile and re-kyc
```
```
authData otp Yes Based on preference authMethods
otp.
```
```
otp-value Encrypted otp Yes Encrypted otp for verification
```
```
V3 Request Body:
```
Request Body (^)


###### {

```
"scope": [
"abha-profile",
"re-kyc"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": "{{txnId}}",
"otpValue":
"YPuOEWGzsHykA1JAOPK7tjBYliIKFu5e1b7Mye7f5+HQJrhJlaIl5FnIFv2Le9YxCZBUYBkNV1Q/BABhatn144uU5l/HDqRH2ZcUVR9UUZXm/
5AQDHzI+5N+iacngufcRN/qK0CbEgWn1sPCyNj3tdD3t9EISK/dOQq62YBTKE453o3teoGEEN0dcQlnAz23oGBWNRQmcdlqOyrb/+u8jHDqT
eEV7/QNm6UHVAufjgkLoPDwbcZ0KErcdl6h6jawKV44mIrjFX/WqDsyvy+/tQY/DhnxcTvw9qZ1WdyXgIz3NP7OxOzlRkxOEDDrn1d9Ta6JfGT
yVGP1TrnUxZxh+UMWKohXMRA9ctfUhOSvFZbz+E6RDKbnkIeq1DV4+iy6bmccRo/fcpooTQKSRndSwsT3YFGHzQEnD0elHixIDWuC6FVFb/
N9GU6QES9ErMCIR5WGlT62h5zni+YDstRmf6aP9ET1AjjeWg0psPyMYZhMetIOciMdU2SC/9+WOBlFfVoLJSog+XUjgSFh696I+IQXo6kAh6r
h9P5hh9RK+BgqbQ2M0d1fhFbzTP044nXlV9ywLwEpIc5f5aFkgThEIDsurPx2wSTUXe0oR8zjdFGcdea4mvZs0eqx62qGwaB08gIcZENhFD6s
d7bJZlpz8sJoYzpnNte1UDfNMPZXhpg="
```
```
}
}
}
```
**V3 Response:**
Response
**Code: 200 OK**
{
"txnId": "bb548986-e96d-4b48-be1b-1e36741e867d",
"authResult": "success",
"message": "Re-kyc done successfully",
"accounts": [
{
"ABHANumber": " 91 - 4173 - 3253 - XXXX"
}
]
}

## 9.0 Get Profile

Get Profile API returns the ABHA profile upon successful validation of the JWT access token.

**V3 URL:** {{ env_url}}/abha/api/v3/profile/account
**V3 Request:** GET

**V3 Request Headers:**

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body parameters: NA
V3 Request body: NA
```
```
V3 Response:
```
Response^

**Code :200 OK** (^)
{
"ABHANumber": " 91 - 4173 - 3253 - XXXX",
"preferredAbhaAddress": "TEST@abdm",


"mobile": "******7930",
"firstName": "Gaurav",
"middleName": "",
"lastName": "Kumar",
"name": "Gaurav Kumar",
"yearOfBirth": " 1991 ",
"dayOfBirth": " 1991 ",
"monthOfBirth": " 10 ",
"gender": "M",
"email": "gk135266@gmail.com",
"profilePhoto":
"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",
"stateCode": " 10 ",
"districtCode": " 215 ",
"subDistrictCode": null,
"villageCode": null,
"townCode": null,
"wardCode": null,
"pincode": " 821307 ",
"address": "Near Urvashi Hotel, Gandhi Nagar, Ward- 28, Road No- 3, Dehri, Rohtas, Bihar",
"kycPhoto":
"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", "stateName": "BIHAR",
"districtName": "ROHTAS",
"subdistrictName": "ROHTAS",
"villageName": null,
"townName": "Dehri",
"wardName": null,
"authMethods": [
"AADHAAR_BIO",
"PASSWORD",
"MOBILE_OTP",
"DEMOGRAPHICS",
"AADHAAR_OTP"
],
"tags": {},
"kycVerified": true,
"verificationStatus": "VERIFIED",
"verificationType": "AADHAAR",
"emailVerified": false
}


## 10.0 Generate QR Code

Generate QR API returns the QR code upon successful validation of the JWT access token.
**V3 URL:** {{base_url}}/v3/profile/account/qrCode
**V3 Request:** GET **V3
Request Headers:**

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Request body:** NA

##### V3 Response:

## 11.0 Generate ABHA Card

Get ABHA card API returns ABHA Card upon successful validation of JWT access token.

**V3 URL:** { env_url}}/abha/api/v3/profile/account/abha-card

**V3 Request:** GET

**V3 Request Headers:**


```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Response:**

```
Response^
```
Code: 202 Accepted (^)
ABHA Card (^)

## 12.0 Forgot ABHA number

### 12.1 Recover via Aadhaar OTP

This API used to recover the ABHA number using Aadhaar OTP.

```
Step 1: Generate Aadhaar OTP
```
##### V3 URL: {{base_url}}/v3/profile/login/request/otp

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```

**V3 Body Parameters:**

```
Property Name Value Mandatory Description
txnId Empty No Transaction Id is Mandatory to identify the unique
transaction for ABHA enrolment. This chains all the steps to
enrol in ABHA. Transaction Id will be returned after a
successful OTP transaction.
```
```
Scope abha-login,
aadhaarverify
```
```
Yes Defines the scope of the current action of the API,
following are the values that can be used.
```
```
ABHA_ENROL("abha-enrol"),
```
```
loginHint aadhaar Yes Type of login
loginId Encrypted
Aadhaar
number
```
```
Yes Actual value of login type. This needs to be RSA encrypted
using a public key
```
```
otpSystem aadhaar Yes Otp system to verify login, following are the values that can
be used.
```
```
AADHAAR("aadhaar")
```
**V3 Request Body:**

```
Request Body^
```
```
{
"txnId": "",
"scope": [
"abha-login",
"aadhaar-verify"
],
"loginHint": "aadhaar",
"loginId": " {{AADHAAR_encrypted_Output}} ",
"otpSystem": "aadhaar"
}
```
**V3 Response:**

```
Response
```
```
Code: 200 OK
{
"txnId": "c6a49f66-c740-4a7d-a93d-8c0431bbb8f3",
"message": "OTP is sent to Aadhaar registered mobile number ending with*******8510"
}
```

```
Step 2: Verify Aadhaar OTP
```
**V3 URL:** {{base_url}}/v3/profile/login/verify

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
aadhaar- verify
```
```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
```
```
otpValue Encrypted OTP
value
```
Yes (^)
authMethods otp Yes Type of login, following are the values that can be used
OTP("otp"),
PASSWORD("password"),


**V3 Request Body:**
Request Body
{
"scope": [
"abha-login",
"aadhaar-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " _{{txnId}}_ ",
"otpValue": " _{{OTP_encryption}}_ "
}
}
}

**V3 Response:**
Response
**Code: 200 OK**
{
"txnId": "15fbec8b- 0168 - 471d- 8691 - 003c183a24fb",
"authResult": "success",
"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0yNTY4LTcwNzMtNDgxOSIsImNsaWVudEl
kIjoiYWJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJtb2JpbGUiOiI5ODcyNjk5MjYwIiwiYWJoYU
51bWJlciI6IjkxLTI1NjgtNzA3My00ODE5IiwicHJlZmVycmVkQWJoYUFkZHJlc3MiOm51bGwsInR5cCI6IlRyYW5zYWN0aW
9uIiwiZXhwIjoxNzA3MTI0MDI4LCJpYXQiOjE3MDcxMjIyMjgsInR4bklkIjoiMTVmYmVjOGItMDE2OC00NzFkLTg2OTEtMDA
zYzE4M2EyNGZiIn0.OqM17elgGWTYizhn6RIw3VlepK1ClcXdbw6ry8dDjPZepzbngrGQVUn0Na4uT7bMjgRXC3mNTaUZWvJGLLCYnEXijtqImzyQ
ATTHI_4KlTlAd4PSEyZlmPjdFRiSoaz_etNt
6RPDt9q5 tze64YLudufxsiCfDkfr0J6w6yK3crWYkobCIKMokVzVdnGM9X1ysEduK-bozTIPvsyXwdfa3dc9km5nFCIcFWaXQajPk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9. wEvha4yvYo4WNYMxigG7ObhAKL6ICUJGQ9hiGCglPwc2e1FrFXmw5W ",
"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": "91- 4819 - 7073 - XXXX",
"preferredAbhaAddress": "guneetarora@sbx",
"name": "Guneet Singh Arora",
"status": "ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nIC
IsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy
MjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB9QE80yB+ar6jDFd6dNazcxzq0bgHBKkEHH4VJnimzH9x9
TTA+bdQtXs7+4tpCpkhlaNyvTcpwcfiKpnrXW+P7E2niy4YKqpcIsyhfcYJPuWVjXJHpVoBvU4FdVoN5aafFtyCzcs2OSa
w9KhgeZpbj/Vp0Hqat3MFk7BoJjGeoDMMfzrOpZ+6zWCa1R6Bp+qWc0qASAbuma3WeMBMMmGbH1+leTWcjRnBb
cvsa7bQ7uRrcIXJA+6PQVyygom6k5bm9PNDAMysqj3rGuPENhCflkDHOMYrG1y/kaR4t/U8CuXkt5riY/vD15JojTi9WNy
a2L/iOaz1CYXMACzdGA/ ACP+BV65bda4rwLYf2d4ct1YYef9+/OR8wGPp8oXj1zXb2i/ ="
}
] }


### 12.2 Recover via Mobile OTP

This API used to recover the ABHA number using Aadhaar OTP.
**Step 1: Generate OTP**

API accepts mobile numbers and then generates OTP for the entered mobile number.

**V3 URL:** {{base_url}}/v3/profile/login/request/otp

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request
was initiated, ISO 8601 represents
the date and time by starting with
the year, followed by the month, the
day, the hour, the minutes, seconds,
and milliseconds
Authorization
Token
```
```
{{accesstoken}} Yes Token generated from session API
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
mobile-verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint mobile Yes Type of login, following are the values that can be used
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
```
loginId Encrypted
Mobile number
```
```
Yes Actual value of login type. This needs to be RSA encrypted using
public key
```

```
otpSystem abdm Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request body:
Request Body^
{
"scope": [
"abha-login",
"mobile-verify"
],
"loginHint": "mobile",
"loginId": " {{Mobile_Encryption}} ",
"otpSystem": "abdm"
}
```
```
V3 Response:
```
Response^

**Code: 200 OK**

```
{
"txnId": "67f12929-22fd- 4826 - a8f3-a6fef3e11244",
"message": "OTP sent to mobile number ending with ******9260"
}
```
```
Step 2: Verify OTP
```
```
This API accepts encrypted OTP from the user, once the OTP is successfully validated a session token
is generated along with the list of ABHA numbers (ACTIVE and DEACTIVATED) linked with the mobile
number.
```
```
V3 URL: {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the
endtoend request transaction
```

TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date
and time by starting with the year,
followed by the month, the day, the
hour, the minutes, seconds, and
milliseconds

Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
Scope abha-login,
mobile-verify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
authMethods otp Yes Type of login, following are the values that can be used
```
```
OTP("otp"),
PASSWORD("password"),
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
otpValue Encrypted OTP
value
```
Yes (^)
**V3 Request Body:**
Request Body


###### {

```
"scope": [
"abha-login",
"mobile-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " {{txnId}} ",
"otpValue": " {{OTP_encryption}} "
}
}
}
```
**V3 Response:**
Response
**Code: 200 OK**
{
"txnId": "ec5d10f4-41c9-4d7e-b857-4a77b04a35b7",
"authResult": "success",
"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5ODcyNjk5MjYwIiwiY2xpZW50SWQiOiJhYmhhLXByb2ZpbGUtYXBwLWFwaSIsIn
N5c3RlbSI6IkFCSEEtTiIsIm1vYmlsZSI6Ijk4NzI2OTkyNjAiLCJ0eXAiOiJUcmFuc2ZlciIsImV4cCI6MTcwNzEyMzM2MywiaW
F0IjoxNzA3MTIzMDYzfQ.Jn9Xt0UuiVJ61-9paqnr0KWoy9T6pdc2QKQRv5qH6NlCuJcoYq-ch8JVM7xHa6CkgDvT4PZj_

###### ",

```
"expiresIn": 300 ,
"accounts": [
{
"ABHANumber": "91- 2568 - 7073 - XXXX",
"preferredAbhaAddress": "nilam12@sbx",
"name": "Nilam Barve",
"gender": "F",
"dob": "07- 03 - 1997",
"status": "ACTIVE", "profilePhoto":
"/9j/zVr7GGNefc7jIEYzjFLKmwZNaotkU4A5qveRooztpXGY3lGe4RNu4kgBSM7j2Fen2MC29vHChJCKFyep964rSYkWc
XUzKiqQF8xwgB/vc9QCVHHfHvXbWs8dxAs0EkcsbdHjcMDjjgjrXo0YcsTgrT5pBMWWynkX7yxtjnHIFVwvlbY5BuUj589i
Rzj061dj+YlCM5JqNh56O+CcsxBPpk4rUyZFKJ13zQHzE2fKg9Qp7e5x09acl6pco4IOSAQMjg4/MnPHtUdrJ5c/lE8HpVu
SBJTuK/OMfOOCMdOaVgRLFKrqGRgynuDmpw3FY32Sa3Km3fI3AHHB2/
/Nzz+WfNfLI/7pJbuXkbY2GxfYtyM9QcZyDRRQtQZWn03U70lprt7WLGPKt2Izxj5j/EcADnPTtWzpOnzRafJJYhZJ0lwVbM
anoQAccgBsZx1zRRTa0EpNGfFcRyXE8SRoojYkBGBG3dgY/Nf++gOatDGOKKK82vFRloelSk3HUgcYYnNRR239o38Vpn
G/JLegHU/0+poopUopyVx1JNRbQmr+bpV/aRWLRSzRAxmJskAHaQTg5BAUdcZD5ycVJBrUqS+ZqViBJtCm4tC2SA2
4Bh98KPQFs/3T0oor0kjzeZnU2ModAwmWbnKsuPmfX+E8d8DH1B6dKbp7Smwg81NknlLvTH3WIyR+tFFMorz5Vgw6g1
owS70Vs+xoopMS3Eb5W9qbJFHcgFwcjIDDqAQQf59DRRSGf/9k=",
"kycVerified": true
}
] }
```

**Step 3: Verify User** This API accepts
the ABHA number and transaction id,
once both are validated a session
token is generated.

```
V3 URL: {{base_url}}/v3/profile/login/verify/user
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the endtoend
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the
date and time by starting with the
year, followed by the month, the day,
the hour, the minutes, seconds, and
milliseconds
```
```
Authorization
Token
```
```
{{accesstoken}} Yes Token generated from session API
```
```
T-token Bearer {{token}} Yes Token received in login/verify API. Its’
valid for 5mins.
```
##### V3 Body parameters:

```
Property Name Value Mandatory Description
ABHANumber AbhaNumber_encryption Yes encrypted 14-digit ABHA number
```
```
txnId 9b4ce0f9-3a27-
4598a02ab889479f4fb0
```
```
Yes Transaction Id is Mandatory to identify the unique
transaction for ABHA login generated from Verify OTP
step.
```
```
V3 Request Body:
Request Body^
```
```
{
"ABHANumber":" {{AbhaNumber_encryption}} ",
"txnId":" {{txnId}} " }
```
```
V3 Response:
Response^
```

**Code :200 OK** (^)

###### {

```
"token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS00MTczLTMyNTMtNTQwNiIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJtb2JpbGUiOiI3ODEzMDEwMTYxIiwiYWJoYU51bWJlciI6IjkxLTQxNzMtMzI1My01
NDA2IiwicHJlZmVycmVkQWJoYUFkZHJlc3MiOiI5MTQxNzMzMjUzNTQwNkBhYmRtIiwiZXhwIjoxNjc0Njc0OTI1LCJpYXQi
OjE2NzMzNzg5MjUsInR4bklkIjoiODY1MjEzODgtZThkNS00NzJjLWFmYzEtYjEyZjE0ZDgyMGM4In0.OiNgxXenYMMliGNtNx4OPr29qyXYBunU
a3DSKyy2TRRWRNZfP1bW6CWNlz-
9QbKnfgmDx44Q9QMkQwRxJBnbaA9A9SmchriMgG1OWc6H1DittwzdUSfhUkNDAbr1eHLbtXcbKqAAIPhZ9uWw7nshhxKXkYmMWPGAUm
9T-
N746Lb4P1qQQfo6RQA7r4fq5g_6fyhFxnlz2_HV2XSVy3gyZZ3aJPmM0APZLMjLYbvkoxV8HXWcYXLXYW7EYdRCh8unJ
eY3Px2VDqvdsJr3z8jmsGsbltxTBtymoJBo3rR243zO2u-wf1dEZuZbsiNko5Yeu67Mu2p3o6z6bAoMzK6crxcus0gw0kuAkUuC8md1Xy4-
FD98TtUmETa5umWW3zs155_J4rK9cd1wmNP0MLRjCt5hRpqfFxmrSWNatw61VdQp6enUAg9Kkf8eLLIaQFv_qSIKyhMgSFXjKk2PBU2nvC3L
uDcqf_YxCxqzwXc_rrzOLN2h6MzGYQgtXqf1gsrD_IQ7H14-
BZwkrDeYMVsDSiZCFGqJfDJBLQNIfc7eZKGmkjTFz_ldUL4EaIJ3qX2TblMCCW5UA2IYbLJPcICPaCLXApf2zpaOnZmBh
Ur8ycDYTCVnMt6XpZm7J5by-CAcYa0v0rTN7H-RbJOEq3loLiooPf4dWZd4UUreTA",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS00MTczLTMyNTMtNTQwNiIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNjc0Njc0OTI1LCJpYXQiOjE2NzMzNzg5MjV
9.cyskKue4BcVt-vpx5rCVUeocEXYtzFAubtmJHaaPUtd4AOdUnhlyOJSBNkHk5IlJcwdpqrRntWj5ynpTFJ8nGnRRi2fbP6Cu89y29K0AnPm
SFeaO9kNm1LM53ZA5I9VwAAN3zLqySm8s6ccPFKf_pe-ewHvb73k2k2InjpjTsww_kmVtHs4R46EuhzoKXYx48TOVmsraO1ScfAjYm-
R1LZ66T42PXVrJaZ6RSrRmuW6Xc_N7cmDermpjmO3to1ZinEAry8jcHZXnmTTWCTwXzzST4TFOQ7fQn_t4xmtUQr1QHKcF4M-
mpKCRfbaGBazz6DldpvC2HEkbROIz8_XQDUIgPOon2JX2sMQ27IzobPp4LRwiVTKtpAOprTvRVBqW4i6GirYf3i7JXgv4
UOtYQOLfnKOh7lZsbtph4tXfIgWWzZ8dzinWRdUUWVEZDP_Fn5oPm1EqH87JDM6mNTQExfrAZ4PxsgAkNXZnxjkV6fCKj
KshwsZmgnJtwHiA2Ep48z2zaWQnNqEfMxb_cLmfa6ZqDY_2MAVsFddGgj3Hguekdb8kcC_OJ705qaGh2XwflS67rT
TZSehTC1-UZyXA0sQPSN4FLvY3D-mM4VhHNB7Kp-xEJHOkKS_3Gz7LqpfCiTPyJ4EEOvbvWb1HgMBXHv3kGuuay4srGisZ4mjE",
"refreshExpiresIn": 1296000 }
```
## 13.0 Benefit API’s

These APIs are used by government integrators with some special benefits.

### 13.1 Create ABHA using Aadhaar

##### Step 1: Generate Aadhaar OTP

This API accepts encrypted Aadhaar Number and then Generates OTP for Aadhaar linked mobile number.

##### V3 URL: {{base_url}}/v3/enrollment/request/otp

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```

```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**Note: To create account using benefit program, benefit name needs to pass in the header.**

**V3 Body Parameters:**

```
Property Name Value Mandatory Description
txnId Empty No Transaction Id is Mandatory to identify the unique
transaction for ABHA enrolment. This chains all the steps to
enrol in ABHA. Transaction Id will be returned after a
successful OTP transaction.
```
```
Scope abha-
enrol
```
```
Yes Defines the scope of the current action of the API,
following are the values that can be used.
```
```
ABHA_ENROL("abha-enrol"),
```
```
loginHint aadhaar Yes Type of login
loginId Encrypted
Aadhaar
number
```
```
Yes Actual value of login type. This needs to be RSA encrypted
using a public key
```
```
otpSystem aadhaar Yes Otp system to verify login, following are the values that can
be used.
```
```
AADHAAR("aadhaar")
```
**V3 Request Body:**

```
Request Body^
```
```
{
"txnId": "",
"scope": [
"abha-enrol"
],
"loginHint": "aadhaar",
"loginId": " {{Aadhaar_encrypted_Output}} ",
"otpSystem": "aadhaar"
}
```
**V3 Response:**

```
Response
```
```
Code: 200 OK
```

###### {

```
"txnId": "c6a49f66-c740-4a7d-a93d-8c0431bbb8f3",
"message": "OTP is sent to Aadhaar registered mobile number ending with*******8510"
}
```
### Step 2: Enrol ABHA

API Accepts Transaction ID (previous step response) and encrypted OTP along with a primary mobile
number for ABHA.

**V3 URL:** {{base_url}}/v3/enrollment/enrol/byAadhaar

##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**Note: To create account using benefit program, benefit name needs to pass in the header.**

**V3 Body Parameters:**
Property Name Example Value Mandatory Description

```
authData Empty Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA enrolment. This chains all the steps to enrol in ABHA.
Transaction Id will be returned after a successful OTP transaction.
```
```
authMethods otp Yes Defines the authentication method used for enrolment, following are
the values that can be used.
```
```
OTP("otp"),
PI("pi"),
```

```
timeStamp Actual time, format :
"YYYY-
MM-DD HH:mm:ss"
```
```
Yes The actual time when the request was initiated, ISO 8601 represents
the date and time by starting with the year, followed by the month, the
day, the hour, the minutes, seconds, and milliseconds
```
```
txnId Actual
Transaction Id
```
```
Yes Transaction Id received as a response to request/mobileOrEmailOTP
API
```
otpValue Encrypted OTP value Yes (^)
Mobile Primary Mobile number Yes If the user wants to use a mobile number which is other than the mobile
number which is linked with the Aadhaar number
Consent - Yes (^)
Code abha-enrollment Yes Consent code for creating AHBA number
Version 1.4 Yes Consent version for creating ABHA number
**Note: mobile parameter in the below request is referred to as the primary mobile number
V3 Request Body:**
Request Body
{
"authData": {
"authMethods": [
"otp"
],
"otp": {
"timeStamp": " 2023 - 07 - 07 16:48:39",
"txnId": " _{{txnId}}_ ", "otpValue":
"L3y7R6WotN21IVDJACL6d7mDh5MVBUAbmXCiyoDMbkP7Cinzn4ZjBmrpsUSOqlvE/U9q9/qWw9I8Yf6GDgS0oM9IMu3z1fDOERaW0bQW
gt3+tKxwkioHAKO8G2RvUCIpSPeBo2Cnwj9l6CNIeT6VbNSrX0ZlSK02eFtllOtzfo80iW2OXkAUybhv7DdZL2KxKNrExsubJf74knLgaFRj8TtbvaE
MO2gi6EsdFOgh3SzvGh9oFYdOi5etlwyqvvZ1evjvfFQFiRAQro7c1ksl59y2sn9JThbvZxQlH8eNWN802IysqaCr+tzVU/SaEK5fl3yUWdDIW2qJZ
QP1XtutHBqVHLB2SNDzt8Uta/UnrBBASuQz+dHfGikR2L4qxeGib7R5Q9qDutcZVIxzLVNTdSeGOUjVpl2YvYa7E5k4rCQyH91rpfX0K3ioa5vtkLr
3XC1pM+Ni57wgRKLfnxcI4XDgAcDv117/9T90JeqlBOWVmvKNBSEFjFSnd7feiE388EI1fVbIj86HoA7UwgSYYbkSe7/YpqE0u0OE9VrFCWHHbo
xgOE/sLio3KJFTsRAQi9QntIO2ycirCC5S7/neQ1B8WYQyPEj533ArBYNfdzkmt4x67PtZUTIuG4lwIQ6GnfjD5CC0iXZJvnZHUelQYUINuXrns5ze7
pxretKmYCE=",
"mobile": “{{mobile_number}}”
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
} }

##### V3 Response:

```
Response
Code: 200 OK
```

###### {

"message": "This account already exist",
"txnId": "0413d789- 5543 - 4236 - ae55-bac5b1abcb83",
"tokens": {
"token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0yMTY4LTU1NzctMjc3MCIsImNsaWVudElkIjoiYWJoYS1wcm9m
aWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjoiODQ0NjY1MzIwNCIsImFiaGFO
dW1iZXIiOiI5MS0yMTY4LTU1NzctMjc3MCIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTEyMTY4NTU3NzI3NzBAc2J4IiwidHlwIjoiVHJhbnNhY3R
pb24iLCJleHAiOjE3MTc0MDgxMDUsImlhdCI6MTcxNzQwNjMwNSwidHhuSWQiOiIwNDEzZDc4OS01NTQzLTQyMzYtYWU1NS1iYWM1YjFhY
mNiODMifQ.lwyLIiG8av4adgjHH0u4jFQXsVSSCvgweqnDo8kvtk3bxezx_zHhMJSz-9S1BHJFR82FRf1OcAlUiowY_lTR-O-
Gi18eNAvmE0g6s53atVSodZWDHewuR2dM9WYgKj2C8GB-gArOuKx4Xl1u-
j6kt1ANtbaXvTtZI59nl0NCQDP5me0Wp_HjwBtL3Og9bXZ4i2e2EcEyIbW_jmkdLFG3lJicBCh_GQwdB5ssiVS5A5xK_M0woAIEtRmreGV1AxHKSRX5P-
K_m2LS7odh3WcKZbv5pSpIzIo4uutjvZAGItZwxT2q0iAb89MSgz1dI-
JmEKY9Oo7ttelMPjl0_yirPdPnpeW199TM9u03O09CUK2gQ77sMnB54gClSAbqx_fao2A0a3UQPYGjuwUleC4_vsnvdAcb70NdTEYtV6ZhdMsDpVRcR0NTuI
3VIOu0no8farjg5QCXAtP-
a6MpQ8IZO7yIL2_eRcLpOvQiYrNCL1nS_YdclsDRp6PYPycSGKGAER9KoRp7oN0AFxdSDmXva2AZk_wz3gEwTWT_6chCpBkEpvGSr36s2_Bah
jyYjvE5WDPYXk8GuqEsKV00KjCN1foU2TyGxN_FvWd8iZaYnceAhOj06bczjBmgsQwbTBeiG3UO_zoiWZJlPiPCi5eVCQT51J2Aw56aon4pN4",
"expiresIn": 1800 , "refreshToken":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0yMTY4LTU1NzctMjc3MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW
0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE4NzAyMzA1LCJpYXQiOjE3MTc0MDYzMDV9.qTI8USAfZF9pGBdKQY5jeHU85LY4AwFA
eGkBD0pgcd_QfAVZQYNrYBkG53WfWDoOC2sWRZyaqoSh61zSjR-NWsEi5lf519-
dQdhT6WwWKAH0XSeCuM5qNFwVWeexgVj_LoPwVdn1DmcTsnhawDqepSV6DO9cOeJIn7xLd5G6wTJQ85HLi0h8vyHUGKh5koCwcGSrgo
6EYmDlwLoMmC5lqm-OcbsipPV0xdvQq0tS65Pw5JXlgZ-fkuDSYFibXV9Y5fLIzgFVQiAG6F3AQgrX-nW-
MdNgoDBn6o2bMnmZC7ak1Rbq5lv8SZCg82QB8aHCPGc7uCcneY6LEE_o6QopPTJEpLZ2JybOyxsoZfdwzRAHKpDmUgoOH7dN1OQIAsNsqwaP
WHIGc4CPaJKkp92TKx8bm21BAHIBzzvZYOzh9tjfg9VSyi6SBSa9b-
uIIZkxyphOJQv1262oomJShkBcQsMhBaSQ4zZdHC_pk6EA9MWl53vzW28LKRrlsQ0twr8Y5_xlWBzv8XAGJaijtmIEwNPq9chHShsxrUe-
j_LdG4PHtupsPKW4Ik9vLOMzizLAgvlmM4ZBq1i6a8E9cAYScXENUvvMFmd86E_4kL_iTpC1v35aS9pGDuoTbSjp9YnUZLAnGAcKDEyi1OWVqWD3t2ibu-
AAvLN3qqzQZg",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Pragati",
"middleName": "Sudhakarrao",
"lastName": "Pinge", "dob": " 11 -
08 - 1998 ", "gender": "F", "photo":
"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", "mobile":
"******6654",
"email": null,
"phrAddress": [
"91216855772770@sbx"
],
"address": "DILDARPURA, Achalpur, Achalpur, Amravati, Maharashtra", "districtCode":
" 468 ",
"stateCode": "27",
"pinCode": " 444806 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "AMRAVATI",
"ABHANumber": " 91 - 2168 - 5577 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": false }
**Note:**

**1. If the primary mobile number matches with Aadhaar linked mobile number then mobile is**
    **saved in DB and if the primary mobile number is different from Aadhaar linked mobile number**
    **then mobile is not saved and its value is null.
2. In case mobile number is null, it can be update using mobile updation APIs. To update the**
    **mobile number please refer Section: 3 (Step 4- ABHA Mobile Verification).
3. After creating account, need to create ABHA address. For ABHA address creation please**
    **refer Section: 3 (Step 6: ABHA Suggestions and ABHA Address creation).**


### 13.2 Create ABHA via Biometric

#### 13.2.1 Create ABHA via FingerPrint

##### Note : List of UIDAI-approved biometric devices

##### - https://uidai.gov.in/en/ecosystem/authentication-devices-

##### documents/biometrichttps://ind01.safelinks.protection.outlook.com/?url=https://uidai.gov.in/en/ecosystem/

authentication-devices-documents/biometric-
devices.html&data=05|02|Kushal.Pandita@ltimindtree.com|022d6e5cc5ca4c50ddc708dd93aaf31c|ff3552897
21e4dd7a663afec62ab9d54|0|0|638829084605444457|Unknown|TWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRyd
WUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ==|0|||&sdata=l/nQjzqQwmHiwJj++2

##### ueol9Tlnbz1iunxdtKxwPjPLQ=&reserved=0devices.html.(Kindly note that the list is updated by UIDAI

##### periodically.)

```
This API creates an ABHA account using FingerPrint.
```
```
V3 URL: {{base_url}}/v3/enrollment/enrol/byAadhaar
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
Note: To create account using benefit program, benefit name needs to pass in the header.
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
```
```
authData Empty Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA enrolment. This chains all the steps to enrol in ABHA.
Transaction Id will be returned after a successful OTP transaction.
```

```
authMethods bio Yes Defines the authentication method used for enrolment, following are
the values that can be used.
```
```
BIO("bio"),
```
```
txnId Actual
Transaction Id
```
```
Yes Transaction Id received as a response to request/mobile Or Email OTP
API
fingerPrintAuthPid Encrypted
fingerPrintAuthPid
value
```
```
Yes PID value is base 64 encoded which is generated by fingerprint
scanner device.
```
Mobile Primary Mobile number Yes If the user wants to use a mobile number which is other than the
mobile number which is linked with the Aadhaar number

Consent - Yes (^)
Code abha-enrollment Yes Consent code for creating AHBA number
Version 1.4 Yes Consent version for creating ABHA number
**Note: mobile parameter in the below request is referred to as the primary mobile number
V3 Request Body:**
Request Body
{
"authData": {
"authMethods": [
"bio"
],
"bio": {
"aadhaar": "{{Encrypted Aadhaar Number}}",
"fingerPrintAuthPid": "<PID>",
"mobile": “{{mobile_number}}"
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
}
}
**Note: Checkpoints to generate fingerprintAuthPid:- lr = 'Y'; (This Attribute should
be passed as 'Y' otherwise it will give K-547 error) ra = deviceType;
rc = 'Y'; de = 'N'; pfr = 'N'; text = '2.5' + ra + rc + lr + de + pfr; wadh =
Base64.stringify(sha256(text)) or Convert to SHA-256 and then to base64.**

##### V3 Response :

```
a) If the primary mobile number matches with Aadhaar linked mobile number.
Response
```

Code: 200 OK

###### {

"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTn
VtYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW
5zYWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1Mj
YzNzE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG
0C5eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DD
JgtxAtP6Gem5jy-
82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXm-EIZhhwV3TXfhCg6lgnbg-YXN6668oAoGCg8G5tljjim6-
5yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosYDHphVXNPnHo
eXvoBWqhZ_A-oOpY-
j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vghh3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZN
DOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc


```
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTj
t2MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXs
cQqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Nilam",
"middleName": "Pratik",
"lastName": "Jadhav",
"dob": " 26 - 11 - 1999 ",
"gender": "F",
"photo": "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",
"mobile":"******1670"
"email":"******1670"
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": " 27 ",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}
```
b) If the primary mobile number is different from Aadhaar linked mobile number.

```
Response
```

```
Code : 200 OK
```
{
"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",



"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTnV
tYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW5z
YWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1MjYzN
zE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG0C5
eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DDJ
gtxAtP6Gem5jy-82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXmEIZhhwV3TXfhCg6lgnbg-
YXN6668oAoGCg8G5tljjim65yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosY
DHphVXNPnHoe XvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC
1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTjt2
MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXsc
QqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Priyanka",
"middleName": "Sudhir",
"lastName": "Varude",
"dob": " 26 - 11 - 1989 ",
"gender": "F",
"photo": "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",
"mobile": null,
"email": null,
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode":
" 494 ",
"stateCode": "27",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}

```
Note:
```
**1. If the primary mobile number matches with Aadhaar linked mobile number then mobile is**
    **saved in DB and if the primary mobile number is different from Aadhaar linked mobile number**
    **then mobile is not saved and its value is null.
2. In case mobile number is null, it can be update using mobile updation APIs. To update the**
    **mobile number please refer Section: 3 (Step 4- ABHA Mobile Verification).
3. After creating account, need to create ABHA address. For ABHA address creation please**
    **refer Section: 3 (Step 6: ABHA Suggestions and ABHA Address creation).**

#### 13.2.2 Create ABHA via FaceAuth

```
This API creates an ABHA account using FaceAuth.
```
```
V3 URL: {{base_url}}/v3/enrollment/enrol/byAadhaar
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**Note: To create account using benefit program, benefit name needs to pass in the header.**

**V3 Body Parameters:**
Property Name Example Value Mandatory Description

```
authData Empty Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA enrolment. This chains all the steps to enrol in ABHA.
Transaction Id will be returned after a successful OTP transaction.
```
```
authMethods face Yes Defines the authentication method used for enrolment, following are
the values that can be used.
```
```
FACE("face"),
```
```
txnId Actual
Transaction Id
```
```
Yes Transaction Id received as a response to request/mobileOrEmailOTP
API
rdPidData
Encrypted rdPidData
value
```
```
Yes PID value is base 64 encoded which is generated by the Aadhaar RD
service application
```
```
Mobile Primary Mobile number Yes If the user wants to use a mobile number which is other than the
mobile number which is linked with the Aadhaar number
```
Consent - Yes (^)
Code abha-enrollment Yes Consent code for creating AHBA number
Version 1.4 Yes Consent version for creating ABHA number
**Note: mobile parameter in the below request is referred to as the primary mobile number
V3 Request Body:**
Request Body
{
"authData": {
"authMethods": [
"face"
],
"face": {


```
"aadhaar": "{{Encrypted Aadhaar Number}}",
"rdPidData": "<PID>",
"mobile": “{{mobile_number}}"
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
} }
```
##### V3 Response :

a) If the primary mobile number matches with Aadhaar linked mobile number.
Response
Code: 200 OK


###### {

"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTn
VtYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW
5zYWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1Mj
YzNzE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG
0C5eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DD
JgtxAtP6Gem5jy-
82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXm-EIZhhwV3TXfhCg6lgnbg-YXN6668oAoGCg8G5tljjim6-
5yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosYDHphVXNPnHo
eXvoBWqhZ_A-oOpY-
j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vghh3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZN
DOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTj
t2MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXs
cQqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Nilam",
"middleName": "Pratik",
"lastName": "Jadhav",
"dob": " 26 - 11 - 1999 ",
"gender": "F",
"photo": "/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDc
pLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMj
L/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQID
AAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1


```
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",
"mobile":"******1670"
"email":"******1670"
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": " 27 ",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}
```
```
b) If the primary mobile number is different from Aadhaar linked mobile number.
```
```
Response
```
```
Code : 200 OK
```
{
"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTnV
tYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW5z
YWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1MjYzN
zE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG0C5
eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTES-
aCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DDJgtxAtP6Gem5jy-
82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXmEIZhhwV3TXfhCg6lgnbg-YXN6668oAoGCg8G5tljjim6-
5yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosYDHphVXNPnHoe
XvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC
1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTjt2
MkecmaRMoorscip-


812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXsc
QqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-



PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5K
R5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Priyanka",
"middleName": "Sudhir",
"lastName": "Varude",
"dob": " 26 - 11 - 1989 ",
"gender": "F",
"photo": "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",
"mobile": null,
"email": null,
"phrAddress": [
"91160145481380@sbx"
],



"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra",
"districtCode": " 494 ",


"stateCode": "27",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}

```
Note:
```
**1. If the primary mobile number matches with Aadhaar linked mobile number then mobile is**
    **saved in DB and if the primary mobile number is different from Aadhaar linked mobile number**
    **then mobile is not saved and its value is null.
2. In case mobile number is null, it can be update using mobile updation APIs. To update the**
    **mobile number please refer Section: 3 (Step 4- ABHA Mobile Verification).
3. After creating account, need to create ABHA address. For ABHA address creation please**
    **refer Section: 3 (Step 6: ABHA Suggestions and ABHA Address creation).**

#### 13.2.3 Create ABHA via IrisAuth

```
This API creates an ABHA account using IrisAuth.
```
```
V3 URL: {{base_url}}/v3/enrollment/enrol/byAadhaar
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
Note: To create account using benefit program, benefit name needs to pass in the header.
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
```

authData Empty Yes Transaction Id is Mandatory to identify the unique transaction for ABHA
enrolment. This chains all the steps to enrol in ABHA.
Transaction Id will be returned after a successful OTP transaction.

authMethods iris Yes Defines the authentication method used for enrolment, following are the
values that can be used.

```
IRIS("iris"),
```
txnId Actual
Transaction Id

```
Yes Transaction Id received as a response to request/mobileOrEmailOTP API
```
pid Encrypted PID value Yes PID value is base 64 encoded which is generated by iris scan device.

Mobile Primary Mobile number Yes If the user wants to use a mobile number which is other than the mobile
number which is linked with the Aadhaar number

Consent - Yes (^)
Code abha-enrollment Yes Consent code for creating AHBA number
Version 1.4 Yes Consent version for creating ABHA number
**Note: mobile parameter in the below request is referred to as the primary mobile number
V3 Request Body:**
Request Body
{
"authData": {
"authMethods": [
"iris"
],
"iris": {
"aadhaar": "{{Encrypted Aadhaar Number}}",
"pid": "<PID>",
"mobile": “{{mobile_number}}"
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
}
}

##### V3 Response :

```
a) If the primary mobile number matches with Aadhaar linked mobile number.
Response
Code: 200 OK
```

###### {

"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTn
VtYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW
5zYWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1Mj
YzNzE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG
0C5eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DD
JgtxAtP6Gem5jy-


```
82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXm-EIZhhwV3TXfhCg6lgnbg-YXN6668oAoGCg8G5tljjim6-
5yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosYDHphVXNPnHo
eXvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwc
C1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTj
t2MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXs
cQqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Nilam",
"middleName": "Pratik",
"lastName": "Jadhav",
"dob": " 26 - 11 - 1999 ",
"gender": "F",
"photo": "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",
"mobile":"******1670"
"email":"******1670"
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": " 27 ",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}
```
b) If the primary mobile number is different from Aadhaar linked mobile number.


```
Response
```
Code : 200 OK


###### {

"message": "Account created successfully",
"txnId": "2ec82835- 9314 - 4296 - acc0-5d526371998d",
"tokens": {
"token": "eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJ
oYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIjpudWxsLCJhYmhhTnV
tYmVyIjoiOTEtMTYwMS00NTQ4LTEzODAiLCJwcmVmZXJyZWRBYmhhQWRkcmVzcyI6IjkxMTYwMTQ1NDgxMzgwQHNieCIsInR5cCI6IlRyYW5z
YWN0aW9uIiwiZXhwIjoxNzE1ODUwNDY2LCJpYXQiOjE3MTU4NDg2NjYsInR4bklkIjoiMmVjODI4MzUtOTMxNC00Mjk2LWFjYzAtNWQ1MjYzN
zE5OThkIn0.NXTXYzvRmGVTAeByvPW9rLFhYPASOveshK9fvMFY1X00u0LBJNQ5ZzSS0llOwBCOU6yW5wDCA9a03W59UUGEOjXs9QXQG0C5
eyWVQSMLsuYwxjhMXN0yNhQxFTMiXjZFfGiXJEuCsHznT5f0UHZINd82dw-
bJjZpwFoY_y66tmxpHme7Z5kvGKmiheUKpQBcSw6pj6WzzuA2AVB0w15yLW3LAdsxMZqFTESaCxC_iQSJc2HOcGduWQu4L9i5rJLEn8Rn4yx_DDJ
gtxAtP6Gem5jy-82qQausJUyC30kvuExY5BFpvpnXHarJoAtmkCRwnci_mJf4TLjl8ygfAncXmEIZhhwV3TXfhCg6lgnbg-
YXN6668oAoGCg8G5tljjim65yEKJH4bgArhsYJ_0djLKK_UqFjXRpY6CoJ6S_qgNBUVtA1Mw9LOc12Tfj3_P_gKxoBrPz5AA_aYOIqQYsnB5TISI4dzN2HaTrVgeosY
DHphVXNPnHoe XvoBWqhZ_A-oOpY-j9j2qeRRXOdWiRgl47juFDPO_ze_iBBCgYxZqdfdmf35Hk3JXbe1_Y3Qs12PG8dXB9vgh-
h3fLkxH_swTMR13JJYWNcU9CAFXbcirTEDTWTngdh2JZNDOboz7_Q68_L8rxGM49kZCQcaVWr5jlPsGvJ7Ban3Ur8kk",
"expiresIn": 1800 ,
"refreshToken": "eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xNjAxLTQ1NDgtMTM4MCIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC
1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE3MTQ0NjY2LCJpYXQiOjE3MTU4NDg2NjZ9.feDbP3ZZ5rjyVHVNTjt2
MkecmaRMoorscip-
812w899srCCKvdqawh2dwyDsJLOJS6O7tw1g5Bu7qOJdr3GxfQDFzGV3rejfVDNyuq8ZRzyUrrWR3x3P54JbZ51msY0W166arm0SSypaKKitaXsc
QqykCwbeuGzMjSWWaENcAVH26XOBVUheZez4ctFpi-
INt51vH3rp0QOy6ZmeCH7uYprrcihqRWyOabsYV4rOy41ioTyJxLS0Odw4m0OhXFiEVzZWnzrHvruaIawWFPcw1Ervv9KQu-
Ph33wQ56wWep5Q4wff29BvNcG3LOadboI0biVcKH0BxcXmvVV0pJybz2gMcrKJIT3TnpYI2LzuwaNcvN4u1NR0tNWLo1iyHk8mMML_DAaquJ
_x8b0zUkHYm4Ow7sSul_kIE8_QrT4bGiHa24b_x1XxfRLP3V-drvQzAnCHaiCK-
PXqPv97q3BuKFTBhpvvTkQrOgrDdWqCcKb5KmbfLRvPydiY0yhG0hwiMXsiHHUT3VfgiwuIu-vA90re--
ZB5hPe_zVeGp3YrP9hnY6N5zYUUTsKG1JD5ntdRTkRPHbhAOaWI2kpdsD6NuQVKKB9AkwzQTWaID2Ue_08nN6vz8v4adAvj94wxeGJRutI8A0kFHzM14PLv5
KR5c-HM-iWZMaW5k5yCZNo",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Priyanka",
"middleName": "Sudhir",
"lastName": "Varude",
"dob": " 26 - 11 - 1989 ",
"gender": "F",
"photo": "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",
"mobile": null,
"email": null,
"phrAddress": [
"91160145481380@sbx"
],
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "districtCode": " 494 ",
"stateCode": "27",
"pinCode": " 415001 ",
"abhaType": "STANDARD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 1601 - 4548 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true
}

```
Note:
```
**1. If the primary mobile number matches with Aadhaar linked mobile number then mobile is**
    **saved in DB and if the primary mobile number is different from Aadhaar linked mobile number**
    **then mobile is not saved and its value is null.
2. In case mobile number is null, it can be update using mobile updation APIs. To update the**
    **mobile number please refer Section: 3 (Step 4- ABHA Mobile Verification).
3. After creating account, need to create ABHA address. For ABHA address creation please**
    **refer Section: 3 (Step 6: ABHA Suggestions and ABHA Address creation).**

### 13.3 Link OR Delink ABHA With Benefit Name

#### 13.3.1 Link ABHA With Benefit Name

##### Step 1: This API is used to Link ABHA account with benefit name.

```
V3 URL: {{base_url}}/v3/profile/benefit/linkAndDelink
V3 Request: POST
```

**V3 Request Headers:**

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body parameters:**
Property Name Example Value Mandatory Description

```
Scope
link
Yes Based on preference link option
```
```
loginHint abha-number / xmlUid Yes Based on preference link by abha number or
xml uid
loginId RSA Encrypted abha number / xml
uid
```
```
Yes Based on preference link by abha number or
xml uid values
```
##### a) Link by ABHA number.

**V3 Request Body:**
Request Body (Link)
{
"scope": [
"link"
],
"loginHint": "abha-number",
"loginId":
"DhcsvJORTk4LlTxYHyGehwc9bssmiLDUxwAF6quQHtZ0suDJZWfsaEzbdNCOA8wr4NM3woa995KLzCj3p2u1uXnJkZWGIdYOfW3UnOcfWdZ
FMNbtXjfge2ChcZFTZjYPHJVW2H/14BUxl4UvU74FM4LD1rmjotqF5PgryyNnNRFaQMZ7iq6I8PZk7oXa92Qpk1kJTRHUt84uv1IssIqsUr3HngI
pLbOHuuPMixG/balCpe0MAXuVyDXIratJATAWAuOl0ucNGaAJcUhjcwXuuDeERDG4rhcYAxTm9rkf6TJzQuF8uw0Nr9A95Brcus141Dy/ORcmF
GzLzHCkby0zKnEXn6QQSzZ70coLXoTOjpV3CtJ2wt22oZd62zvwrk8TFRnA8Z8ww4uLCo7tg9ASiOxYgLDE/b1Ry1h/gZHVj7mD2V4c1gMtBZcU
hoWYzSEp2DvH45bGWmjsb0EHkUQ/r61+E7143VDU018QdIETb80gfK8Rsffb+7JmLEQ4yXcJNe4ODo30jtCANji51iP2FQycJIbzMoV5gw8iNS
KrTNHi2qjZ64w/sim093WiBrFvoYjmB0hY8Pl5hYh0EWuFDJ0So86emqqdvkCyXeHAeQaSDIQAI4AE5+QX4OTBsdzv1+ja9b4uGG5Em/+98i0V
/EalBXPwrNcxKZcIL1S8OZM="
}


**V3 Response:**
Response (Link)
**Code: 200 OK**
{
"benefitName": "COVIN",
"healthId": " 91 - 5150 - 4867 - XXXX",
"status": "Benefit record has been linked successfully" }

##### b) Link by XmlUid

**V3 Request Body:**

```
Request Body^
{
"scope": [
"link"
],
"loginHint": "xmluid",
"loginId": " {{XmlUid_encryption}} "
}
```
**V3 Response Body:**
Response
**Code: 200 OK**
{
"benefitName": "COVIN",
"healthId": " 91 - 5713 - 4487 - XXXX",
"status": "Benefit record has been linked successfully"
}

##### c) Link By X-Token

**V3 Request Body:**

```
Request Body^
{
"scope": [
"link"
] }
```
**V3 Response:**
Response
**Code: 200 OK**


###### {

```
"benefitName": "COVIN",
"healthId": " 91 - 5713 - 4487 - XXXX",
"status": "Benefit record has been linked successfully"
}
```
#### 13.3.2 De-link ABHA With Benefit Name

##### Step 1: This API is used to De-link ABHA account with benefit name.

**V3 URL:** {{base_url}}/v3/profile/benefit/linkAndDelink

**V3 Request:** POST

**V3 Request Headers:**

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body parameters:**

```
Property Name Example Value Mandatory Description
```
```
Scope
de-link
Yes Based on preference delink
```
```
loginHint abha-number / xmlUid Yes Based on preference delink by abha number
or xml uid
loginId RSA Encrypted abha number / xml
uid
```
```
Yes Based on preference delink by abha number
or xml uid values
```
**V3 Request Body:**
Request Body


###### {

```
"scope": [
"de-link"
],
"loginHint": "abha-number",
"loginId":
"DhcsvJORTk4LlTxYHyGehwc9bssmiLDUxwAF6quQHtZ0suDJZWfsaEzbdNCOA8wr4NM3woa995KLzCj3p2u1uXnJkZWGIdYOfW3UnOcfWdZ
FMNbtXjfge2ChcZFTZjYPHJVW2H/14BUxl4UvU74FM4LD1rmjotqF5PgryyNnNRFaQMZ7iq6I8PZk7oXa92Qpk1kJTRHUt84uv1IssIqsUr3HngI
pLbOHuuPMixG/balCpe0MAXuVyDXIratJATAWAuOl0ucNGaAJcUhjcwXuuDeERDG4rhcYAxTm9rkf6TJzQuF8uw0Nr9A95Brcus141Dy/ORcmF
GzLzHCkby0zKnEXn6QQSzZ70coLXoTOjpV3CtJ2wt22oZd62zvwrk8TFRnA8Z8ww4uLCo7tg9ASiOxYgLDE/b1Ry1h/gZHVj7mD2V4c1gMtBZcU
hoWYzSEp2DvH45bGWmjsb0EHkUQ/r61+E7143VDU018QdIETb80gfK8Rsffb+7JmLEQ4yXcJNe4ODo30jtCANji51iP2FQycJIbzMoV5gw8iNS
KrTNHi2qjZ64w/sim093WiBrFvoYjmB0hY8Pl5hYh0EWuFDJ0So86emqqdvkCyXeHAeQaSDIQAI4AE5+QX4OTBsdzv1+ja9b4uGG5Em/+98i0V
/EalBXPwrNcxKZcIL1S8OZM="
}
```
**V3 Response:**

Response (De-Link) (^)
**Code: 200 OK**
{
"benefitName": "COVIN",
"healthId": " 91 - 5150 - 4867 - XXXX", "status": "Benefit record has been De-linked successfully”. }
**b) De-link by XmlUid
V3 Request Body:**
Request Body^
{
"scope": [
"de-link"
],
"loginHint": "xmluid",
"loginId": " _{{XmlUid_encryption}}_ "
}
**V3 Response Body:**
Response
**Code: 200 OK**
{
"benefitName": "healthid api",
"healthId": " 91 - 2168 - 5577 - XXXX",
"status": "Benefit record has been de-linked successfully"
}

##### c) De-link by X-Token

```
Request Body
{
"scope": [
"de-link"
] }
```

**Response:**
Response
**Code: 200 OK**
{
"benefitName": "healthid api",
"healthId": " 91 - 2168 - 5577 - XXXX",
"status": "Benefit record has been de-linked successfully"
}

### 13.4 Update ABHA Profile Details

This API used to update user profile details using Benefit API.

#### 13.4.1 Update Mobile

**V3 URL:** {{env_url }}/abha/api/v3/profile/account
**V3 Request:** PATCH

**V3 Request Headers:**
Property Name Example Value Mandatory Description

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
```
```
abhaNumber Abha Number Yes User ABHA number is Mandatory if we not
passing X-token in headers
```
```
Mobile 7011872400 No User mobile number
```
```
accountStatus
ACTIVE
No Benefit programmers can update deactivated
account to active account by using this key
value
```

```
profilePhoto Base 64 profile photo No User profile photo
```
**V3 Request Body:**

```
Request Body^
```
```
{
"abhaNumber": "91- 4656 - 1028 - XXXX",
"mobile": "******2406",
"accountStatus": "ACTIVE",
"profilePhoto": “<<Base 64 user profile photo>>”
}
```
**V3 Response:**

Response (^)
**Code: 200 OK**
{
"benefitName": "COVIN",
"healthId": "91- 5713 - 4487 - XXXX",
"status": "Benefit record has been linked successfully"
"ABHANumber": "91- 5713 - 4487 - XXXX",
"preferredAbhaAddress": "91571344873849@abdm", "mobile":
"******2841",
"firstName": "Ranjith",
"middleName": "",
"lastName": "R",
"name": "Ranjith R",
"yearOfBirth": "1998",
"dayOfBirth": "31",
"monthOfBirth": "05",
"gender": "M",
"email": "ranjith.10696235@ltimindtree.com",
"profilePhoto": "profile photo",
"status": "ACTIVE",
"stateCode": "32",
"districtCode": "563",
"subDistrictCode": **null** ,
"villageCode": **null** ,
"townCode": **null** , "wardCode": **null** ,
"pincode": "679302",
"address": "Pathiripala", "kycPhoto": "AA==",
"stateName": "KERALA",
"districtName": "PALAKKAD",
"subdistrictName": "PALAKKAD",
"villageName": **null** ,
"townName": null,
"wardName": null,
"authMethods": [
"EMAIL_OTP",
"MOBILE_OTP"
],
"tags": {},
"kycVerified": true,
"verificationStatus": "VERIFIED",
"verificationType": "DRIVING_LICENCE", "emailVerified": "ranjith.10696235@ltimindtree.com"
}


#### 13.4.2 Update Profile........................................................................................................................

**V3 URL:** {{base_url}}/v3/profile/account

**V3 Request:** PATCH
**V3 Request Headers:**

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
```
```
abhaNumber Abha Number Yes User ABHA number is Mandatory if we not
passing X-token in headers
```
```
Mobile 7011872400 No User mobile number
```
```
accountStatus
ACTIVE
No Benefit programmers can update deactivated
account to active account by using this key
value
```
```
profilePhoto Base 64 profile photo No User profile photo
```
**V3 Request Body:**

```
Request Body^
```
```
{
"abhaNumber":"{{abhaNumber/x-token}}",
"accountStatus":"ACTIVE"
}
```
**V3 Response:**


```
Response^
```
**Code: 200 OK** (^)
{
"benefitName": "COVIN",
"healthId": "91- 5713 - 4487 - XXXX",
"status": "Benefit record has been linked successfully"
"ABHANumber": "91- 5713 - 4487 - XXXX",
"preferredAbhaAddress": "91571344873849@abdm",
"mobile": "******2841",
"firstName": "Ranjith",
"middleName": "",
"lastName": "R",
"name": "Ranjith R",
"yearOfBirth": "1998",
"dayOfBirth": "31",
"monthOfBirth": "05",
"gender": "M",
"email": "ranjith.10696235@ltimindtree.com",
"profilePhoto": "profile photo",
"status": "ACTIVE",
"stateCode": "32",
"districtCode": "563",
"subDistrictCode": **null** ,
"villageCode": **null** ,
"townCode": **null** ,
"wardCode": **null** ,
"pincode": "679302",
"address": "Pathiripala",
"kycPhoto": "AA==",
"stateName": "KERALA",
"districtName": "PALAKKAD",
"subdistrictName": "PALAKKAD",
"villageName": **null** ,
"townName": null,
"wardName": null,
"authMethods": [
"EMAIL_OTP",
"MOBILE_OTP"
],
"tags": {},
"kycVerified": true,
"verificationStatus": "VERIFIED",
"verificationType": "DRIVING_LICENCE", "emailVerified": "ranjith.10696235@ltimindtree.com"
}

#### 13.4.3 Update Profile........................................................................................................................

**V3 URL:** {{api_gateway}}/abha/api/v3/profile/account

**V3 Request:** PATCH
**V3 Request Headers:**

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the endto-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
```
```
abhaNumber Abha Number Yes User ABHA number is Mandatory if we not
passing X-token in headers
```
```
Mobile 7011872400 No User mobile number
```
```
accountStatus
ACTIVE
No Benefit programmers can update deactivated
account to active account by using this key
value
```
```
profilePhoto Base 64 profile photo No User profile photo
```
```
V3 Request Body:
```
Request Body^

```
{
"abhaNumber": " 91 - 6160 - 6504 - XXXX",
"mobile": "******3662",
"accountStatus": "ACTIVE" ,
"profilePhoto": “<<Base 64 user profile photo>>”
}
```
```
V3 Response:
Response^
```
**Code: 200 OK** (^)
{
"benefitName": "COVIN",
"healthId": "91- 5713 - 4487 - XXXX",
"status": "Benefit record has been linked successfully"
"ABHANumber": "91- 5713 - 4487 - XXXX",
"preferredAbhaAddress": "91571344873849@abdm",
"mobile": "******2841",
"firstName": "Ranjith",
"middleName": "",
"lastName": "R",
"name": "Ranjith R",
"yearOfBirth": "1998",


```
"dayOfBirth": "31",
"monthOfBirth": "05",
"gender": "M",
"email": "ranjith.10696235@ltimindtree.com",
"profilePhoto": "profile photo",
"status": "ACTIVE",
"stateCode": "32",
"districtCode": "563",
"subDistrictCode": null ,
"villageCode": null ,
"townCode": null ,
"wardCode": null ,
"pincode": "679302",
"address": "Pathiripala",
"kycPhoto": "AA==",
"stateName": "KERALA",
"districtName": "PALAKKAD",
"subdistrictName": "PALAKKAD",
"villageName": null ,
"townName": null,
"wardName": null,
"authMethods": [
"EMAIL_OTP",
"MOBILE_OTP"
],
"tags": {},
"kycVerified": true,
"verificationStatus": "VERIFIED",
"verificationType": "DRIVING_LICENCE", "emailVerified": "ranjith.10696235@ltimindtree.com"
}
```
### 13.5 Search Benefit Details

This API used to search benefit details linked to ABHA Number.

#### 13.5.1 Search by Aadhaar

**V3 URL:** {{base_url}}/v3/profile/benefit/search
**V3 Request:** POST
**V3 Request Headers:**
Property Name Example Value Mandatory Description

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```

```
V3 Body Parameters:
Property Name Example Value Mandatory Description
scope search Yes Search scope
```
```
loginHint abha-number/xmlUid Yes Based on preference of search we can use
abha number or xml uid to search details
```
```
loginId
Encrypted abha number or xmluid No Encrypted abha number or xmluid to search
```
```
V3 Request Body:
```
Request Body^

```
{
"scope": [
"search"
],
"loginHint": "xmlUid",
"loginId": "{{xmlUid_encryption}}"
}
```
```
V3 Response:
Response^
```
**Code: 200 OK** (^)
[
{
"stateCode": **20** ,
"benefitName": "COVIN",
"benefitId": "2229031721737473",
"abhaNumber": "91- 5150 - 4867 - XXXX",
"status": 0
} ]

#### 13.5.2 Search by Health Id Number

```
V3 URL: {{base_url}}/v3/profile/benefit/search
V3 Request: POST
V3 Request Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
scope search Yes Search scope
```
```
loginHint Abha-number/xmlUid Yes Based on preference of search we can use
abha number or xml uid to search details
```
```
loginId
Encrypted abha number or xmluid No Encrypted abha number or xmluid to search
```
```
V3 Request Body:
```
Request Body^

```
{
"scope": [
"search"
],
"loginHint": "abha-number",
"loginId": "{{AbhaNumber_encryption}}"
}
```
```
V3 Response:
Response^
```
**Code: 200 OK** (^)
[
{
"stateCode": **20** ,
"benefitName": "COVIN",
"benefitId": "2229031721737473",
"abhaNumber": "91- 5150 - 4867 - XXXX",
"status": 0
} ]

#### 13.5.3 Search

```
V3 URL: {{base_url}}/profile/benefit/abha/{{healthIdNumber}}
```

**V3 Request:** GET **V3
Request Headers:**

```
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Response:**
Response
**Code: 200 OK**
{
"abhaNumber": " 91 - 7722 - 7553 - XXXX",
"programme": [
{
"benefitName": "Poshan Abhiyaan"
},
{
"benefitName": "Test Benefit Program"
},
{
"benefitName": "Pradhan Mantri National Dialysis Programme"
}
]
}

## 13.6 Find ABHA (For Govt Entity)

#### 13.6.1 Search ABHA using Mobile

#### 13.6.1.1 Search ABHA

**V3 URL:** {{base_url}}/v3/profile/account/abha/search
**V3 Request:** POST **V3
Request Headers:**


```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end request
transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with the
year, followed by the month, the day, the hour, the
minutes, seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators

```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
scope search-abha Yes Search scope

Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^

{
"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
{
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
"gender": "M"
" kycVerified ": " true ",
"authMethods":
[
"AADHAAR_OTP",
"MOBILE_OTP",
"AADHAAR_BIO",
"DEMOGRAPHICS"
]
```

###### }

###### ]

###### }

###### ]

#### 13.6.1.2 Generate OTP

```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
```
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
```
Scope abha-login,
mobileverify
search-abha

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
loginHint index Yes Index of ABHA number given in search API response.

loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key
otpSystem abdm Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.


```
V3 Request Body:
```
```
Request Body^
```
{
"scope": [
"abha-login",
"search-abha",
"mobile-verify"
],
"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "abdm",
"txnId": "{{txxnId}}"
}

##### V3 Response:

```
Response
Code: 200 OK
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "OTP sent to mobile number ending with ******6265"
}
```
#### 13.6.1.3 Verify OTP

```
V3 URL : {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API
```
##### V3 Body Parameters:


```
Property Name Example Value Mandatory Description
scope abha-login mobile-verify Yes Defines the scope of the current action of the API
```
```
authMethods “otp” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
```
```
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the unique
transaction for ABHA enrollment. This chains all
the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
otpValue Encrypted OTP value^
Yes Otp received on mobile should be encrypted first
```
```
V3 Request Body:
```
Request Body^

{
"scope": ["abha-login","mobile-verify"],
"authData": {"authMethods": ["otp"],
"otp": {
"txnId": "{{otpTxnId}}",
"otpValue": "{{rsaOtpEncryptionOutput}}"
}
}
}

##### V3 Response:

```
Response^
```
200 OK (^)


###### {

"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",
"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-
F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI", "expiresIn": 1800 , "refreshToken":

"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR
LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-

zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",

"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",
"preferredAbhaAddress": "narayananxxx@sbx",
"name": "Narayanan Madaswamy", "status":
"ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar
1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx
Gz3jSoTtKv29+lehaL4nTUMJIMEgfMRjB759vf3rxNZACDjmtSx1a4snDRu20NuKk0nED32Mh1BU5GM5qXGK5Twh4pg1mP
7K6mO7ReV5wwHGRn+VdeF4rN6CI8e1AqXbmkK47UANC0bakC0u2i4HmMn3jUdPmyJDxTBSGLS0lGaAIrq4S2geWRgqK
MkmvPNW1P7fdM6AiIcKD1rd8Xagu1bJHOeGfB/IVx7cn5fxqorqAE/NmlwD3ojjaRtqjn1rQi01m6559Ku41FsoBSTtBOB60w
xsPcV0cGkqpUsefpVoaZGw5QAdqTki1TZy0YkXkA4pxXkHOcV1Uelx7vmUY+lTDRosHCcH2p3D2bOVUjB7U4S4PA5rTu9HaB
iyDI9Ky8MmVIwfcUyGmtzV0/UpbW5SRZHjbPLISDjvzXsPhrxZYajCYTOyyq2AJW5Yex714TuKnJzVy3lyC245FS1cR9LDDDjmlx


```
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"
}
]
}
```
#### 13.6.2 Search ABHA using Aadhaar

#### 13.6.2.1 Search ABHA

**V3 URL:** {{base_url}}/v3/profile/account/abha/search


```
V3 Request: POST V3
Request Headers:
```
```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end request
transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with the
year, followed by the month, the day, the hour, the
minutes, seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators

```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
scope search-abha Yes Search scope

Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^

{
"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
{
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
"gender": "M"
" kycVerified ": " true ",
"authMethods":
[
"AADHAAR_OTP",
```

###### "MOBILE_OTP",

###### "AADHAAR_BIO",

###### "DEMOGRAPHICS"

###### ]

###### }

###### ]

###### }

###### ]

#### 13.6.2.2 Generate OTP

```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
```
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-verify
search-abha

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
loginHint index Yes Index of ABHA number given in search API response.

loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key


otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.

```
V3 Request Body:
```
```
Request Body^
```
{
"scope": [
"abha-login",
"search-abha",
"aadhaar-verify"
],
"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "aadhaar",
"txnId": "{{txxnId}}"

}

##### V3 Response:

```
Response
```
Code: 200 OK

{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "OTP sent to Aadhaar registered mobile number ending with
******6265"
}

#### 13.6.2.3 Verify OTP

```
V3 URL : {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

```
Yes Unique UUID for tracking the end-to-end
request transaction
```

TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
scope abha-login aadhaar-verify Yes Defines the scope of the current action of the API
```
```
authMethods “otp” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
FACE(“face”)
BIO(“bio”) IRIS(“iris”)
```
```
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the unique
transaction for ABHA enrollment. This chains all
the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
otpValue Encrypted OTP value
Yes Otp received on mobile should be encrypted first
```
```
V3 Request Body:
```
Request Body^

{
"scope": ["abha-login","aadhaar-verify"],
"authData": {"authMethods": ["otp"],
"otp": {
"txnId": "{{otpTxnId}}",
"otpValue": "{{rsaOtpEncryptionOutput}}"
}
}
}

##### V3 Response:

```
Response^
```
200 OK (^)
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",


"message": "OTP verified successfully", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-
F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI", "expiresIn": 1800 , "refreshToken":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR
LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-

zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",
"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",
"preferredAbhaAddress": "narayananxxx@sbx",

"name": "Narayanan Madaswamy", "status": "ACTIVE",


"profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar
1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx
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"


###### }

###### ]

###### }

#### 13.6.3 Search ABHA using Biometrics

#### 13.6.3.1 Search ABHA using Biometric ( Face )

##### 13.6.3.1.1 Search ABHA

```
V3 URL: {{base_url}}/v3/profile/account/abha/search
V3 Request: POST V3
Request Headers:
```
```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end request
transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with the
year, followed by the month, the day, the hour, the
minutes, seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators

```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
scope search-abha Yes Search scope

Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^

{
"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
```

###### {

```
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
"gender": "M" ,
" kycVerified ": " true ",
"authMethods":
[
"AADHAAR_OTP",
"MOBILE_OTP",
"AADHAAR_BIO",
"DEMOGRAPHICS"
]
}
]
}
]
```
##### 13.6.3.1.2 Generate OTP

```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
```
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
```

Scope abha-login,
aadhaar-face-verify
search-abha

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
loginHint index Yes Index of ABHA number given in search API response.

loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.

```
V3 Request Body:
```
Request Body^

{
"scope": [
"abha-login",
"search-abha",
"aadhaar-face-verify"
],
"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "aadhaar",
"txnId": "{{txxnId}}"
}

##### V3 Response:

```
Response
```
Code: 200 OK

{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "FACE authentication request successfully sent. "
}


##### 13.6.3.1.3 Verify OTP

```
V3 URL : {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
scope abha-login aadhaar-faceverify Yes Defines the scope of the current action of the API
```
```
authMethods “face” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
FACE(“face”)
BIO(“bio”)
IRIS(“iris”)
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrollment. This
chains all the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
faceAuthPid Generated FaceAuthPid Value^ Yes^ Face auth pid can be generated from the Biometric
systems
```
```
V3 Request Body:
```
Request Body^


###### {

"scope": ["abha-login","aadhaar-face-verify"],
"authData": {"authMethods": ["face"],
"face": {
"txnId": "{{otpTxnId}}",
"faceAuthPid": "{{faceAuthPid}}"
}
}
}

##### V3 Response:

```
Response^
```
200 OK (^)
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",
"message": "FACE verified successfully ", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-
F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI", "expiresIn": 1800 , "refreshToken":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR



LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-

zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",

"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",

"preferredAbhaAddress": "narayananxxx@sbx",
"name": "Narayanan Madaswamy", "status":
"ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar
1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx
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


```
OI1Z3spbS3jjKmf5mdhztz0HpURi39ua6TxPp5ks7S8CnNvJhvQK2Bn8wo/GsQJhs461Tjy7Fx1KhR14bketPjChuhBHtV3yQw6
U5LbPbn2pXHykUeMcAn8KsBJGwcY+tWILcDopq9FCvcUXHylOG0eVstzV8QrEOmTVkAKnygCoipY+tJsrlsV2PBJrY8IzSvcz2D
uWh2B4lz9w55A9ulZkkZI6V1ngvSXVJtQkBAlAWMEdVHf8f6VVKN3YzqGvaajPbny5T5gBwcjkH+tbdvcx3C5Rvw71h3K5bKB
QXO4+4HA/PFPVQp3BijCqlQXQxOhFLWVb6kyELOMjswrTjlSRQyMCK55QcdxHzxDbyzttjjZj7CtW30Rzhp2x/siukgtRGgVFCr
6AYqwI+duK6Y4dbsrmMq2soocCOIfVhn9K0UhWGPzH7dM1ejsgE34xVCctPcbBnaOK2UFFCFtYWmlMzD6D0FTbR9oYcZ+m
auwx+XBhfSmW1oDlmPzE55quUCCeyiuYZLeQZilXacjpn+tcLdWM1hdPbzKdy/dbGA47Ef59q9MEYxgkZHpVLUdHh1a3Cuds
i/6uTHKn/D2qZ07rQqMrM4CNTirMSgEZFXrvQL/TnPmRGSLtJGMjHuO1QRrXJJNaM3TTJolT0qwCo6CokWp1UAZPAHepLG
8scVKkdW7TTbu75t7d2Xj5iML+Z4rqNN8KRR7ZL9llbr5Q+4Pr6/y9q0jTlImU0jG0Xw82pss8oItOvvJ9Pb3rsZQkaC3QAKo+Y9
Ao9P8/4VO8gQbIgMDq/YVkXlyDOsCEhfvMe5NdkIKCOeUm2RTsrXgOMDHAq0FyMjtVSdN06SDpV6LbjqR+NO2pJVdTuJHH
65pY5TC4ZC0Z79wamlTB6k1CyAjgdaUop7iOcKiJcnH0zVuxtDIfMZeD0yKjtoHvLjp8inGfWtSWYQRiNQOPQVcV1ArahOIISi4
BPA4qjZQ7sHGSe9Q3swe4WMElm7Zrd0y08tQZOCR3oerGMktx5YwcD0NUzG4k8uNyMntWreSIgPTGOoNYn2l3kKWq5bP
LdhQ0gLcggtAqLl5W6kmr8BWQD5dpA/OotP0whvMmyzHqTWtKkccOxdqg9eOaaQEIiBPKnJ6HFRyaZYXR/fwQOw6EoCarx
XLPcyKhyi/lmrCXT7yBjavXC9TQ0mAv8AYemKeLG3+mwVbgs7G0UCO2t4sn+BAM0sTuIvNkjTn7oxUlxdfZrYysAvoAOp7Clyrs
F2TLtYjYrE/TAphZS2GfJHVU7fU1UnnlitB5jEyP1GensKZHuhtS5PzNzzTsIY87XF5sRiscfAUVVuEJvVY4xjHHFPsctI7Z5zUt0mAj
8Ek+tIZJ5KlAcA4FMQnGcYI96sRNlccH6VExEc5XC880WAVtxPA69yKhaNgcnBFWlBK5zg+1RMhJIOOe9OwjNSOKxtVCr85FZt
9epBCZnGccAdyfSiinLRAGh6XJK7XlyMSSHIBHQdq3ry5js4cO30oooStG4GEBcapKBhkh6AdzW5YaVHbqG2nPvRRSir6sZpO6
xx9s9qybi4YozPxRRVMRTtBiNifvMeprVsLU8MwBFFFSgNN/LVdzkALWFdXJu9UhQAmNDuwaKKHsBamUyzpvDECn3JVIzjO
AOM0UVQEWnjJZiOCasXgymMA0UVIx1p80W7JqO8TZtcHJB5zRRTAkifI4PWo5AwOQwx6ZoooEf/2Q=="
}
]
}
```
##### 13.6.3.2 Search ABHA using Biometric ( Fingerprint )

##### Note : List of UIDAI-approved biometric devices

##### - https://uidai.gov.in/en/ecosystem/authentication-devices-

##### documents/biometrichttps://ind01.safelinks.protection.outlook.com/?url=https://uidai.gov.in/en/ecosystem/

authentication-devices-documents/biometric-
devices.html&data=05|02|Kushal.Pandita@ltimindtree.com|022d6e5cc5ca4c50ddc708dd93aaf31c|ff3552897
21e4dd7a663afec62ab9d54|0|0|638829084605444457|Unknown|TWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRyd
WUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ==|0|||&sdata=l/nQjzqQwmHiwJj++2

##### ueol9Tlnbz1iunxdtKxwPjPLQ=&reserved=0devices.html.(Kindly note that the list is updated by UIDAI

##### periodically.)

##### 13.6.3.2.1 Search ABHA

```
V3 URL: {{base_url}}/v3/profile/account/abha/search
V3 Request: POST V3
Request Headers:
```
```
Property Name Example Value Mandatory Description
```

REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end request
transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with the
year, followed by the month, the day, the hour, the
minutes, seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators

```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
scope search-abha Yes Search scope

Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^

{
"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
{
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
"gender": "M" ,
" kycVerified ": " true ",
"authMethods":
[
"AADHAAR_OTP",
"MOBILE_OTP",
"AADHAAR_BIO",
"DEMOGRAPHICS"
]
```
###### }


###### ]

###### }

###### ]

##### 13.6.3.2.2 Generate OTP

```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
```
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-bio-verify
search-abha

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
loginHint index Yes Index of ABHA number given in search API response.

loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.

```
V3 Request Body:
```

Request Body^

{
"scope": [
"abha-login",
"search-abha",
"aadhaar-bio-verify"
],
"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "aadhaar",
"txnId": "{{txxnId}}"
}

##### V3 Response:

```
Response
```
Code: 200 OK

{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "Fingerprint authentication request successfully sent. "
}

##### 13.6.3.2.3 Verify OTP

```
V3 URL : {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
```

```
scope abha-login aadhaar-bio-verify Yes Defines the scope of the current action of the API
```
```
authMethods “bio” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
FACE(“face”)
BIO(“bio”)
IRIS(“iris”)
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the
unique transaction for ABHA enrollment. This
chains all the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
fingerPrintAuthPid Generated Fingerprint AuthPid
Value
```
```
Yes Fingerprint auth pid can be generated from the
Biometric systems
```
```
V3 Request Body:
```
Request Body^

{
"scope": ["abha-login","aadhaar-bio-verify"],
"authData": {"authMethods": ["bio”],
"bio": {
"txnId": "{{otpTxnId}}",
"fingerPrintAuthPid": "{{fingerPrintAuthPid}}"
}
}
}

##### V3 Response:

```
Response^
```
200 OK (^)



###### {

"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",
"message": "BIO verified successfully ", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-
F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI", "expiresIn": 1800 , "refreshToken":

"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR
LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-

zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",

"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",
"preferredAbhaAddress": "narayananxxx@sbx",
"name": "Narayanan Madaswamy", "status":
"ACTIVE", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar
1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx
Gz3jSoTtKv29+lehaL4nTUMJIMEgfMRjB759vf3rxNZACDjmtSx1a4snDRu20NuKk0nED32Mh1BU5GM5qXGK5Twh4pg1mP
7K6mO7ReV5wwHGRn+VdeF4rN6CI8e1AqXbmkK47UANC0bakC0u2i4HmMn3jUdPmyJDxTBSGLS0lGaAIrq4S2geWRgqK
MkmvPNW1P7fdM6AiIcKD1rd8Xagu1bJHOeGfB/IVx7cn5fxqorqAE/NmlwD3ojjaRtqjn1rQi01m6559Ku41FsoBSTtBOB60w
xsPcV0cGkqpUsefpVoaZGw5QAdqTki1TZy0YkXkA4pxXkHOcV1Uelx7vmUY+lTDRosHCcH2p3D2bOVUjB7U4S4PA5rTu9HaB
iyDI9Ky8MmVIwfcUyGmtzV0/UpbW5SRZHjbPLISDjvzXsPhrxZYajCYTOyyq2AJW5Yex714TuKnJzVy3lyC245FS1cR9LDDDjmlx


```
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"
}
]
}
```
##### 13.6.3.3 Search ABHA using Biometric (IRIS)

##### 13.6.3.3.1 Search ABHA

**V3 URL:** {{base_url}}/v3/profile/account/abha/search


```
V3 Request: POST V3
Request Headers:
```
```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end request
transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was initiated, ISO
8601 represents the date and time by starting with the
year, followed by the month, the day, the hour, the
minutes, seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

BENEFIT-NAME Client Benefit name Yes Benefit name given to integrato

```
V3 Body Parameters:
```
```
Property Name Example Value Mandatory Description
```
scope search-abha Yes Search scope

Mobile Mobile number Yes User mobile number

```
V3 Request Body:
```
Request Body^

{
"scope": ["search-abha"],
"mobile":"{{Mobile_Encryption}}"

##### }

```
V3 Response:
```
```
[
{
"txnId": "d0660ae0- 1798 - 4e42-8e07-33eea4a3824d",
"ABHA": [
{
"index": 1 ,
"ABHANumber": " 91 - 5259 - 8743 - XXXX",
"name": "Narayanan Madaswamy",
"gender": "M" ,
" kycVerified ": " true ",
"authMethods":
[
"AADHAAR_OTP",
```

###### "MOBILE_OTP",

###### "AADHAAR_BIO",

###### "DEMOGRAPHICS"

###### ]

###### }

###### ]

###### }

###### ]

##### 13.6.3.3.2 Generate OTP

```
V3 URL: {{base_url}}/v3/profile/login/request/otp
```
```
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API

##### V3 Body parameters:

```
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-iris-verify
search-abha

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
loginHint index Yes Index of ABHA number given in search API response.

loginId Index_Encryption Yes Actual value index generated in search API. This needs to be RSA
encrypted using public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```

txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.

```
V3 Request Body:
```
```
Request Body^
```
{
"scope": [
"abha-login",
"search-abha",
"aadhaar-iris-verify"
],
"loginHint": "index",
"loginId": "{{Index_Encryption}}",
"otpSystem": "aadhaar",
"txnId": "{{txxnId}}"

}

##### V3 Response:

```
Response
```
Code: 200 OK

{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"message": "IRIS authentication request successfully sent. "
}

##### 13.6.3.3.3 Verify OTP

```
V3 URL : {{base_url}}/v3/profile/login/verify
```
##### V3 Request: POST

##### V3 Request Headers:

```
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API


##### V3 Body Parameters:

```
Property Name Example Value Mandatory Description
scope abha-login aadhaar-iris-verify Yes Defines the scope of the current action of the API
```
```
authMethods “iris” Yes Defines the authentication method used for
enrolment, following are the values that can be
used
```
```
OTP("otp"),
PI("pi"),
FACE(“face”) BIO(“bio”)
IRIS(“iris”)
```
```
txnId “3585baee-eab3-
4651 - b2cb215ee4f4d181”
```
```
Yes Transaction Id is Mandatory to identify the unique
transaction for ABHA enrollment. This chains all
the steps to enroll ABHA.
Transaction Id will be returned after a successful
OTP transaction.
irisAuthPid Generated Iris AuthPid Value^ Yes^ Iris auth pid can be generated from the Biometric
systems
```
```
V3 Request Body:
```
Request Body^

{
"scope": ["abha-login","aadhaar-iris-verify"],
"authData": {"authMethods": ["iris”],
"iris": {
"txnId": "{{otpTxnId}}",
"irisAuthPid": "{{irisAuthPid}}"
}
}
}

##### V3 Response:

```
Response^
```
200 OK (^)
{
"txnId": "775b6a11-ea05-49e2- 8661 - f9aa855cad34",
"authResult": "success",
"message": "IRIS verified successfully ", "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiY
WJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6InN0YW5kYXJkIiwibW9iaWxlIj
oiOTk5OTI2NjI2NSIsImFiaGFOdW1iZXIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTExMzc2N
zAwNjUyNTlAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjEzODkyNDgsImlhdCI6MTcyMTM4NzQ0OCwidHhuSW
QiOiI3NzViNmExMS1lYTA1LTQ5ZTItODY2MS1mOWFhODU1Y2FkMzQifQ.Bw0NXK2Z1AbCDrehPT8fEcCbNOCJGYBUx2eVf
zMmI1RVK85OxeoGaZPKYc2hIke3wtFkv_BHt45Cfhr-
2Cncb73Kto9NFxPV8M9r9C1NnVlLvXb7beAjHHCTrNS0XW4bID3EdVWllkRwbRSA4HOKBpNphCbth5IG9f8NFyd0Aovp4fv
AJgOi2sTo5JDJdg5GweeSYZSXqQNKK1oDCq_UcuuDG3-
P4gfL1r6K3QKPbEcHF1mmet7iSjopRDPUQuSuvZfG7k1QoDitV2RzXTY-


F9_Em9QmlvzbNJXvBz5T42DZBZa4QTcDbw9KqJwIBLsL_oCx1QEHdDHh1_VH8YO_KmkqIMWpYto09ix34xiZh8LIQKFLFboF
PtndwL9Y6UcI35zeTNQi9GSl7x3CKQIjmGv_lCRyWZXBXDELUPEB2d2fiwQmaPkXTvNnTbGwEi0H8Qv--n-L4-
pERFbmAXqsO4PGf2aRrzz1AOAbJXE1VaVQJP3rOysXL71pTRL8ELF6kmq8tRE_nwBbYI7BQRnHPZ6StGS7cm9C1VYZpyVy22
qX6YslGAmIosTwOcB-
96dEri31WXZRgTYSV_74iNDCBZ3CDUMbBLjtGIRf7UZhmB8Xlx8nuF7qt0WnNtwqoIAtdcQtRWZA3S8BRDiTslYfJfHlVmNSvP
d5n3u_rBD-kmI", "expiresIn": 1800 , "refreshToken":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS0xMzc2LTcwMDYtNTI1OSIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hc
GkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzIyNjgzNDQ4LCJpYXQiOjE3MjEzODc0NDh9.WKYqR
LsamNnDCfXU2OqWUHYzeoe_Tnl9IL16Y62kdZByuBIhwc9nw8KD6M_xZjEmy8aEnGTmwoQPRq4bI1OLiy7m9Dqlbq4fDo_
LsDHikWFqhvNSgNSLD04RQ2TiMOnXkRjOUpF3TgvUeoVOpFi8Q55fLLRFgN5Tuzay0xVyFMZYL-
KW38_h1OU2KyMjErSjrR2su7XdUc0rxMsoDnRGyvZvJW1iRgUfGO0WahT4HpMa1rrYHhOQOEi8RM92zvycjTj4kxwB4HJra
K4XHmFwHAQl_WddrM940c1-
1y3DnTjlTOmgGmn5ym3DI_IHFe0uqQKAAnaLrMFPJvAFxg19bVGN0ipEKDgmyV5reJo2TDPULjsl8Kis8f9-
PVo03cQxJ7krOXc8bqmkqiIYlNdC-JcwDxZE8m5SYVSISnbQK7HGLHWZuuPnyp1-
5iWT1JtJUcdJ0CzGOSOVALtmTSdqqtWV5p8HguO9jNh6znXrrZy0BHzMtY4D5Z169dqCU76ULXtLyATQBSFPF7AHRSqcAiJ4jHU-
NSYsbJSzgD2ryq78pK14LXA-N_Dcohp80Qsd_2f7H_fS2csRgIZL3A-

zqyunUid0ekfv2onySSGYOLib4Iz30Nb8IfM-Ysrm4JT3SkVPu_QgKZ00NNM62ZwduufrICdfeCDJboH67zQQQ",
"refreshExpiresIn": 1296000 ,
"accounts": [
{
"ABHANumber": " 91 - 1376 - 7006 - XXXX",
"preferredAbhaAddress": "narayananxxx@sbx",
"name": "Narayanan Madaswamy", "status": "ACTIVE",


"profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc
KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI
yMjIyMjIyMjIyMjIyMjL/wAARCADIAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8Q
AtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY
3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5u
sLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQo
L/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRo
mJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqs
rO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBs0hBqszE1POpDGq
xrJgFLSCnCgAFOBxSUUgHbqkSQqetRVFcXkNqm+VsDFIDctrvBAJrYhlDqDXmsniyxi5BducYUU+y8frHMqyWrrETjcHyfy/8Ar
1VmI9QWnba5+28U2Eip++Xnvnt61sW+oW04QxzI28/Kdw5oQFoLinbfalyAcE07rQA0LRin4pwWgBmKXFPC0uKYEeKMVJto
20Aef3TZc1VqecguahpDAUtFLSAKM460Vh6/qbWkQjiJDnuD/n3oSuBX1nXGglkghkKbMcpg5Nctc6jd3P8ArZ3ftyaqvIXkZjyS
c1GTgHmtVGwD+nJJzThkd+1M5UBsU0SfNkimBp22p3EBUhz8vTNXIdYuIX3xSuhGSdrEdaxUbeuOmKcvJ+9zRYDsbHxrqsFx
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"


###### }

###### ]

###### }

### 13.7 Child ABHA (These APIs are intended for use only by specific Government

### integrators, approved by NHA).....................................................................................................

##### 13.7.1 Create ABHA

**V3 URL:** {{base_url}}/v3/enrollment/enrol/byAadhaar
**V3 Request:** POST **V3
Request Headers:**
Property Name Example Value Mandatory Description

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of Parent user, user can get X-token
after login to the system
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators which has
role as Hid_Child
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters:**
Property Name Example Value Mandatory Description
authData authMethods Yes child

```
dayOfBirth 21 Yes Child’s Day of Birth
```
```
gender M/F/O Yes Child’s Gender
```
```
name
Ms. Moses Miller Yes Child’s Name
```
```
monthOfBirth 12 Yes Child’s Month of birth
```

```
parentConsent true Yes Parent consent of Child
```
```
consent code (abha-enrollment) version
(1.4)
```
Yes (^)
yearOfBirth 2019 Yes Child’s Year of birth
**V3 Request Body:**
Request Body^
{
"authData": {
"authMethods": [
"child"
],
"child": {
"dayOfBirth": " 2 ",
"monthOfBirth":" 11 ",
"yearOfBirth": " 2019 ",
"gender": "M",
"name": "Mohan Mahadev",
"parentConsent": "true"
}
},
"consent": {
"code": "abha-enrollment",
"version": "1.4"
}
}
**V3 Response:**
Response^
**Code: 200 OK** (^)


###### {

```
"message": "Account created successfully",
"tokens": { "token":
"eyJhbGciOiJSUzUxMiJ9.eyJpc0t5Y1ZlcmlmaWVkIjp0cnVlLCJzdWIiOiI5MS01NDAxLTIyNzYtNzE0MyIsImNsaWVudElkIjoiYWJoYS1wcm9ma
WxlLWFwcC1hcGkiLCJzeXN0ZW0iOiJBQkhBLU4iLCJhY2NvdW50VHlwZSI6ImNoaWxkIiwibW9iaWxlIjoiOTk2MDcwMTY3MCIsImFiaGFOdW
1iZXIiOiI5MS01NDAxLTIyNzYtNzE0MyIsInByZWZlcnJlZEFiaGFBZGRyZXNzIjoiOTE1NDAxMjI3NjcxNDNAc2J4IiwidHlwIjoiVHJhbnNhY3Rpb24i
LCJleHAiOjE3MTgxODkyODEsImlhdCI6MTcxODE4NzQ4MSwidHhuSWQiOiJlMTNkNWYwNC1lNDA5LTQyZTYtOWY0NC00YWM3MTIxMTdiN
zkifQ.sHNuXjFqLiPHyVHg_Y6m5XOeQMAzhAbd6SoqlY7PQuzACr54B3zm8ofXegmfi0_wdtKYbR8ySbc4qkuJaWgeqI0kWt6GNuvZUoEjAqh
mI4fsp3tpcYnhPqlYTVpQsy512y4_DIsYDJeCJaC5g7bhd4VKGP_EvtxIX3pSU_9CqGwy4vPJVdcF4EmHenMhvCdVfHj5lwJPusbskTlgXKk8bwzd
eDWgOo8jXoR9AKEUONTcXUms8VsIXS37twviB6V1LdJMANlEq7vaB0LBj_zSgSCSFSMTNp9OVTKQ8dljqfgrBUVZAry5QJBy9oAf10Fr9zcnLcL
Ok9JZNkIltNtF7P36CHjfrQDFRevRwXwW3T3UChGFSqS3mpvQbnyeBc8AxKZz65ewGV7jbt2gDKXAhlNQL6v3b2inyWVQQx4H6jeNecGuCCw
plUjrE90jd5ZF6lW6dk_VgGgPBFmxZSeUcJmKD3sgPG1bPvjqk2QjB-
wqRcwK7ubqHpCreilC93YjsCbPe1ljYFSCa73_IwipRMQnPJhx5H6ZBGtOBNV_PyiEpE90wDUSWgnaPc9cYg4ch4TCqlq1eucfsWetIQxExYPWKB4_
P9I4UDQOZ56hJOdLWzsrOwCVqsiqnqIjaERBje45AQp2cyCbhaQ01u_oWgcr7 W4MDS_jFEV1xAdZlY",
"expiresIn": 1800 ,
"refreshToken":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiI5MS01NDAxLTIyNzYtNzE0MyIsImNsaWVudElkIjoiYWJoYS1wcm9maWxlLWFwcC1hcGkiLCJzeXN0ZW0i
OiJBQkhBLU4iLCJ0eXAiOiJSZWZyZXNoIiwiZXhwIjoxNzE5NDgzNDgxLCJpYXQiOjE3MTgxODc0ODF9.aUWk66JgkM9FcNfi9MPQSrP6uDNd1U
RFV9V9wP19LApWPf-pwPPNywV0jryubdWbgOtx2C4AONQxM16QdnQB1oeTa78KMSHB2wunMeSy0WzgCnAYJo4la-
OuWeZrJYp44fjDF_TZHJ7053f_o6609j9ghnT8t0KAD8LDt54Avnjf0XOyvtYIoqrN-16DhtuS_BwrfUSQM-
EfoudSaAQqIKEAPbULk44pFG7ZHaOdqeNW7jAh9LW8XX4bWYLDFWxC0ZlxSdvub-GIoiIEAk-
DpKuRC9CvibD3v5ji4tiPjsq7_AwGxITSoK9iESnjwdU_rQ6T_XbldjDaB5oHODgVML2y267_a4lB4N7p6BAivYhX_Q1DODw4m-
89LWCuYtPNu1XdXRT2Vre4qk05WyXrlULvnqB6Dnqda6q7evV-U7Uv7M2xApZeehYk6YiTJwAfjn4eTd5FOjGwleohY3Gah11gc1fQhXIar-
qjtvp1utTwi9HK0ucZEgNZev6ejL2vbYvP6O58Yf6tmQZ-VQVfiP0cgYvrRVmdn5_6vSs9Mv2Nkt-
r1xXE_hmPTUBYb3n2C06hvNwU3bJxGuYgPfIad3tYMgLjQFjX-n59Dl9bzwfy2cR0PBQZeHG1QylNcVQlRdSimX8lvXEOJL8_D-
7xIiVJikgR7Gz6pKGqFSI",
"refreshExpiresIn": 1296000
},
"ABHAProfile": {
"firstName": "Nanduri",
"middleName": "",
"lastName": "Mohite",
"dob": " 22 - 3 - 2022 ",
"gender": "F",
"photo": "",
"mobile": “{{mobile_number}}",
"email": null,
```
```
"phrAddress": null,
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra",
"districtCode": " 494 ",
"stateCode": " 27 ",
"pinCode": " 415001 ",
"abhaType": "CHILD",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"ABHANumber": " 91 - 5401 - 2276 - XXXX",
"abhaStatus": "ACTIVE"
},
"isNew": true }
```
##### 13.7.2 Get Child ABHA

**V3 URL:** {{base_url}}/v3/enrollment/profile/children
**V3 Request:** POST **V3
Request Headers:**

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```

```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of Parent user, user can get X-token
after login to the system
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators which has
role as Hid_Child
Authorization Token {{accesstoken}} Yes Token generated from session API
```
**V3 Body Parameters: NA
V3 Request Body:** NA **V3
Response:**
Response
**Code: 200 OK**
{
"parentAbhaNumber": " 91 - 2385 - 7728 - XXXX",
"mobileNumber": "******1670",
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra", "childrenCount":
1 ,
"children": [
{
"dateOfBirth": " 22 - 3 - 2022 ",
"name": "Nanduri Mohite",
"gender": "F",
"phrAddress": "91540122767143@sbx",
"ABHANumber": " 91 - 5401 - 2276 - XXXX"
}
]
}

##### 13.7.3 Update Child ABHA

**V3 URL:** {{base_url}}/api/abha/v3/profile/account
**V3 Request:** PATCH **V3
Request Headers:**

```
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```

```
BENEFIT-NAME Client Benefit name Yes Benefit name given to integrators which has
role as Hid_Child
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
```
abhaNumber Yes (^)
name
Ms. Moses Miller Yes Child’s Name
dob Birthdate Yes Child DOB in dd-mm-yyyy format
gender M/F/O Yes Child Gender
**V3 Request Body:**
Request Body^
{
"abhaNumber":" 91 - 5523 - 6453 - XXXX",
"name":"Harshal Ram Mahajan ",
"dob":" 23 - 02 - 2019",
"gender":"M"
}
**V3 Response:**
Response
**Code: 200 OK**
{
"ABHANumber": " 91 - 5401 - 2276 - XXXX",
"preferredAbhaAddress": "91540122767143@sbx",
"mobile": "******1670",
"firstName": "Praju",
"middleName": "Sanjay",
"lastName": "kale",
"name": "Praju Sanjay kale",
"yearOfBirth": " 2022 ",
"dayOfBirth": " 16 ",
"monthOfBirth": " 05 ",
"gender": "F",


```
"status": "ACTIVE",
"stateCode": " 27 ",
"districtCode": " 494 ",
"pincode": " 415001 ",
"address": "165/2 Plot no-25 Mangalai Colony Shahunagar, Godoli, Satara, Maharashtra",
"stateName": "MAHARASHTRA",
"districtName": "SATARA",
"subdistrictName": "SATARA",
"authMethods": [
"MOBILE_OTP"
],
"tags": {},
"kycVerified": false,
"verificationStatus": "VERIFIED",
"verificationType": "CHILD_ABHA",
"createdDate": " 12 - 06 - 2024 "
}
```
## 14.0 ABHA Address Verification

## 14.1 ABHA Address Verification via Mobile OTP

### Step 1: Search Auth Methods

**V3 Sandbox URL:**
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/search **V3
Prod URL:**
https://phr.abdm.gov.in/api/phr/web/v3/login/abha/search

**V3 Request:** POST **V3
Request Headers:**
Property Name Example Value Mandatory Description

```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API (Use
ABHA Public Key)
```
**V3 Body Parameters:**
Property Name Example Value Mandatory Description

```
abhaAddress string Yes
```
**V3 Request Body:**


```
Request Body^
```
```
{
"abhaAddress":"singh128@sbx",
}
```
**V3 Response:**
Response Body
{

##### "healthIdNumber": " 91 - 6167 - 8028 - XXXX",

"abhaAddress": "singh128@sbx",
"authMethods": [
"MOBILE_OTP",
"AADHAAR_OTP"
],
"blockedAuthMethods": [],
"status": "ACTIVE",
"message": null,
"fullName": "Deepak Kumar Singh",
"mobile": "******9340"

}

### Step 2: Request ABHA address OTP

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/request/otp
V3 Prod URL:
https://phr.abdm.gov.in/api/phr/web/v3/login/abha/request/otp
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API (Use
ABHA Public Key)
```
```
V3 Body Parameters:
Property Name Value Mandatory Description
```

```
Scope abhaaddresslogin,
mobileverify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint abha-address Yes Type of login, following are the values that can be used
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
```
loginId Encrypted ABHA
Address
```
```
Yes Actual value of login type. This needs to be RSA encrypted using
public key
```
```
otpSystem abdm Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
Request Body
```
{
"scope": [
"abha-address-login",
"mobile-verify"
],
"loginHint": "abha-address", "loginId":
"VTwOF8Fz8KKr0/EsUIgVoF9bSyI2INUer7a3nqEMqWFSimSK67oJ6jRZxzo4bR5fbqLUyHAphK9/seSkOWUPj7f2yij2fmkOJX3PjMb8dooMfvP
N4pBuA627fs8IVaNB1u8fthvjBmdItWocdi2ULXCf7MMBzQzC0FDCO2gk8XF9tohvk1q944svJe/qe4O6tLS494e5Jgm+u+DJ1BN2hhownZbAav
LX8gmNR3AcENH1/hvLR6iomM8dDHa8MtwHMvLiHBWGDCW7pfL9xKANpDMaRcXG/IU4BkUEstOGCHNaMj974XVOhsZOfnVMdwMVvCIJ
gk7WKsAoJDzqNq4L1rQfVyKc8sQBULKQcTuPKCjqUGUzOSHzVAaAeFj4PcOa3Nn1AvjNXAjlMqP36iHarJRywccWVNy50p8YSBDhq7iwvZjPJQ
ua7d9eSM+26TxBnz0rdmEh2mpEKxKUi5RryJFZDovqrZn6lJXg+KUzxyrfhtWD6VGiC9vC/jCZFPbZi83eoBQH71RCO+iVbfj8jgWRPfJjCxkZAar1
N2KdaidlUdEaEG6e7DPIWCGGrucYpTcvTbL12seqm1WswLoplZJm1UBytvCdIk50Ft6MMBOJdY+8kyIF9xZ6b4tudey/UtOFvpiL08y0a+7N5bj
HgkHJK3QJ08YXiFwjbH8OmXQ=",
"otpSystem": "abdm"

}


```
V3 Response:
Response Body
```
{
"txnId": "cd135cce-a178-4a7e-86d8-00dc53ae0192",
"message": "OTP is sent to Mobile number ending with ******9127"
}

### Step 3: Verify ABHA address OTP

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/verify
V3 Prod URL: https://phr.abdm.gov.in/api/phr/web/v3/login/abha/verify
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API (Use
ABHA Public Key)
```
```
V3 Body Parameters:
Property Name Value Mandatory Description
Scope Abha-
addresslogin,
mobileverify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```

```
authMethods otp Yes Type of login, following are the values that can be used
```
```
OTP("otp"),
PASSWORD("password"),
```
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
otpValue Encrypted OTP
value
```
Yes (^)
**V3 Request Body:**
Request Body^
{
"scope": [
"abha-address-login",
"mobile-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " _{{txnId}}_ ",
"otpValue": " _{{OTP_encryption}}_ "
}
} }
**V3 Response:**
Response Body


###### {

"message": "OTP verified successfully",
"authResult": "success",
"users": [

{
"abhaAddress": "singh128@sbx",
"fullName": "Deepak Kumar Singh",
"profilePhoto":
"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
0UU2IrRgktipIiGkVQeAfzoooQH//Z",
"abhaNumber": " 91 - 6167 - 8028 - XXXX",

"status": "ACTIVE",
"kycStatus": "VERIFIED"
}
],
"tokens": { "token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJzaW5naDEyOEBzYngiLCJjbGllbnRJZCI6IlRFU1RfQUJIQSIsInJlcXVlc3RlcklkIjoiQUJIQS1XRUIiLCJzeXN0Z
W0iOiJBQkhBLUEiLCJtb2JpbGUiOiI5MzQwMjM5MTI3IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjAwNjczNzMsImhlYWx0aElkTnVtYm
VyIjoiOTEtNjE2Ny04MDI4LTA4ODIiLCJpYXQiOjE3MjAwNjU1NzMsInBockFkZHJlc3MiOiJzaW5naDEyOEBzYngiLCJhYmhhQWRkcmVzcyI6InN
pbmdoMTI4QHNieCIsInR4bklkIjoiZTFkYmI3ZTAtYzliNi00NDUwLTkyZmEtOGNlMmVjZGY2OWI0In0.JDCwqgAhqG78NbaTdBi94JMxiiS7H9_rSIvhK4UnoFApt0
cVNcnE9Q01041sMNUNFXvKdwKMG45xz15P9ss93Gp8cJh-
0d0ThEk5qNdIgYkcaXYefVOFH5fofLivP3RhotwvYD1rKtgRFNPIKtktOFf2opfcXO5BO736ZK3825LCD6IINgq81m9z4CzzTvbybAoOejLE4AyakJO
z4ObrKeKVOOg9qbLmTbH7rjiKz3Il-bxr46moyazB6YfMWL4FEzvRg13QJS_CMZhY6YSAknp7sH-
12jJd9Pke6TmdWS3LVpz8fRETkVpXlLJ3qs_8eN2SDmaS0WK34KSezAl_6IDAJ3MXyPK6AQD9fEUQoL8n7F2WlIImAkN5Pyq2pLbIKuArfn9gFeywz4
vS7ZgO6v70rC9Nv5qYLwKlWtjYFZZ fxa-g4ub9PC0i6QqLuBhGTlQGiSEGGbRvayEfykAdaA0TE2CQ6MiJmFK5XM1CdolZa8m8iBq56i70CrzfkP4-
QRBwDgPOj8N9uNxnl1OBiLT9FqFVfcqfKtYDZqZ5wwU2qedFeVIzf08BTix7ceOuyWs8zFeMnOIC_FYL5bcfzBByIBv1mqGDjSaFIQaAC5ickx9AV-
4ni0--2Eq3EdghY_EKdZvBkwskBB084iJz6ptp5lrIaEhkXaKuFs",
"expiresIn": 1800 , "refreshToken":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJzaW5naDEyOEBzYngiLCJjbGllbnRJZCI6IlRFU1RfQUJIQSIsInN5c3RlbSI6IkFCSEEtQSIsInR5cCI6IlJlZnJlc2gi
LCJleHAiOjE3MjEzNjE1NzMsImlhdCI6MTcyMDA2NTU3M30.Yb4l9jS1OV6h4wovYa24U1KOeiwXrx8nej3c90oVXl4lD4pBh3kdnwaloocJhgNnx7GjTl
NoQKlCLaoKLJ5kLYClUVFKCTVqEGATicfRDWruIYyTKzlR0E_MvbVFSaOMpatnsMOzbs8c_8xXEtrqEQeW98K4_TWC4gn8goRhpMenUWqDGTZ4Gjn
kHhKYBpmXPssPGqLNO3lNXve-
14X4QTdNZyU9PicqkDlFQpL2HDKSmR8jcUk69hY29n_QB9jKBP5vn4f7HO_YtQ1_Btf_bk4okTXSxwwCowRSJhfsf90HMBqf3SdE1Gi3F8tGxM
WTg3XQdNyx2vlSbfTQxEx7VowHqASRGoNjVZTjKOERMLTvnaxx8gend0jv3oqwRmzqZsXvC2AtyP5QjBDP_dFJy7DaJ0TWn9iwlExiXU5Cuj-
l2hUfyJE6VsMLTsgtQufpDFnNYto_Ob9zZY6PEuNvHg-
c0_9hzoAyj0TZTcW1_rh6yuZqo8pvR_PN40SY6B9FhyxwbbgoDUXqcAxT2J5VtOyrZpAzkzto9sKdJKA1VEEaPh31s-
GfOKPTLkhwG4_bMieCgdPXEbt3oFbcmPzgTIX9NYDWosgvmJVbUAjoz8Hb9ibqsppUcl68ZReRAaRmKmYwajJ6E5dkU5qCsnTXiTpMJNNWpBBaqd
HicM",

"refreshExpiresIn": 1296000
}
}


## 14.2 ABHA Address Verification via Aadhaar OTP

### Step 1: Search Auth Methods

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/search V3
Prod URL: https://phr.abdm.gov.in/api/phr/web/v3/login/abha/search
V3 Request: POST
```
```
V3 Request Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API (Use
ABHA Public Key)
V3 Body Parameters:
Property Name Example Value Mandatory Description
```
```
abhaAddress string Yes
```
```
V3 Request Body:
```
Request Body^

```
{
"abhaAddress":"singh128@sbx",
}
```
```
V3 Response:
```
Request Body^


###### {^

##### "healthIdNumber": " 91 - 6167 - 8028 - XXXX",

"abhaAddress": "singh128@sbx",
"authMethods": [
"MOBILE_OTP",
"AADHAAR_OTP"
],
"blockedAuthMethods": [],
"status": "ACTIVE",
"message": null,
"fullName": "Deepak Kumar Singh",
"mobile": "******9340"

```
}
```
### Step 2: Request ABHA address OTP

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/request/otp
V3 Prod URL:
https://phr.abdm.gov.in/api/phr/web/v3/login/abha/request/otp V3
Request: POST V3 Request
Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API (Use
ABHA Public Key)
```
```
V3 Body Parameters:
Property Name Value Mandatory Description
```

```
Scope Abha-
addresslogin,
aadhaarverify
```
```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"), EMAIL_VERIFY("emailverify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
loginHint Abha-address Yes Type of login, following are the values that can be used
```
```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
```
loginId Encrypted ABHA
Address
```
```
Yes Actual value of login type. This needs to be RSA encrypted using
public key
```
```
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.
```
```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
Request Body
```
{
"scope": [
"abha-address-login",
"aadhaar-verify"
],
"loginHint": "abha-address", "loginId":
"VTwOF8Fz8KKr0/EsUIgVoF9bSyI2INUer7a3nqEMqWFSimSK67oJ6jRZxzo4bR5fbqLUyHAphK9/seSkOWUPj7f2yij2fmkOJX3PjMb8dooMfvP
N4pBuA627fs8IVaNB1u8fthvjBmdItWocdi2ULXCf7MMBzQzC0FDCO2gk8XF9tohvk1q944svJe/qe4O6tLS494e5Jgm+u+DJ1BN2hhownZbAav
LX8gmNR3AcENH1/hvLR6iomM8dDHa8MtwHMvLiHBWGDCW7pfL9xKANpDMaRcXG/IU4BkUEstOGCHNaMj974XVOhsZOfnVMdwMVvCIJ
gk7WKsAoJDzqNq4L1rQfVyKc8sQBULKQcTuPKCjqUGUzOSHzVAaAeFj4PcOa3Nn1AvjNXAjlMqP36iHarJRywccWVNy50p8YSBDhq7iwvZjPJQ
ua7d9eSM+26TxBnz0rdmEh2mpEKxKUi5RryJFZDovqrZn6lJXg+KUzxyrfhtWD6VGiC9vC/jCZFPbZi83eoBQH71RCO+iVbfj8jgWRPfJjCxkZAar1
N2KdaidlUdEaEG6e7DPIWCGGrucYpTcvTbL12seqm1WswLoplZJm1UBytvCdIk50Ft6MMBOJdY+8kyIF9xZ6b4tudey/UtOFvpiL08y0a+7N5bj
HgkHJK3QJ08YXiFwjbH8OmXQ=",
"otpSystem": "aadhaar"

}


```
V3 Response:
Response Body
```
{
"txnId": "1234567890:20211216223812",
"message": "OTP is sent to Aadhaar registered mobile ending xxx001"
}

### Step 3: Verify ABHA address OTP

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/verify V 3
Prod URL: https://phr.abdm.gov.in/api/phr/web/v3/login/abha/verify
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API (Use
ABHA Public Key)
```
```
V3 Body Parameters:
Property Name Value Mandatory Description
Scope abhaaddresslogin,
aadhaarverify
```
```
Yes Defines the scope of the current action of the API, following are
the values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"), EMAIL_VERIFY("email-
verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
```
authMethods otp Yes Type of login, following are the values that can be used
```
```
OTP("otp"),
PASSWORD("password"),
```

```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
otpValue Encrypted OTP
value
```
Yes (^)
**V3 Request Body:**
Request Body^
{
"scope": [
"abha-address-login",
"aadhaar-verify"
],
"authData": {
"authMethods": [
"otp"
],
"otp": {
"txnId": " _{{txnId}}_ ",
"otpValue": " _{{OTP_encryption}}_ "
}
} }
**V3 Response:**
Response Body


###### {

"message": "OTP verified successfully",
"authResult": "success",
"users": [

{
"abhaAddress": "singh128@sbx",
"fullName": "Deepak Kumar Singh",
"profilePhoto":
"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


## 14.3 ABHA Address Verification via Biometric

##### 14.3.1 ABHA Address Verification via Biometric (Face)

### Step 1: Search Auth Methods

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/search V3
Prod URL: https://phr.abdm.gov.in/api/phr/web/v3/login/abha/search
V3 Request: POST
```
```
V3 Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API (Use ABHA
Public Key)
**V3 Body Parameters:**
Property Name Example Value Mandatory Description

abhaAddress string Yes (^)
**V3 Request Body:**
Request Body^
{
"abhaAddress":"singh128@sbx",
}
**V3 Response:**
Request Body^


###### {

##### "healthIdNumber": " 91 - 6167 - 8028 - XXXX",

"abhaAddress": "singh128@sbx",
"authMethods": [
"MOBILE_OTP",
"AADHAAR_OTP"
],
"blockedAuthMethods": [],
"status": "ACTIVE",
"message": null,
"fullName": "Deepak Kumar Singh",
"mobile": "******9340"

```
}
```
### Step 2: Send Face Authentication Request

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/request/otp V3 Prod URL:
https://phr.abdm.gov.in/api/phr/web/v3/login/abha/request/otp V3
Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the

month, the day, the hour, the minutes, seconds, and milliseconds

Authorization Token {{accesstoken}} Yes Token generated from session API (Use ABHA
Public Key)

```
V3 Body Parameters:
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-face-verify

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA-ADDRESS-LOGIN(“abha-address-login")
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```

loginHint abha-address Yes Type of login, following are the values that can be used^

```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
loginId Encrypted ABHA
Address

Yes Actual value of login type. This needs to be RSA encrypted using
public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
Request Body
```
{
"scope": [
"abha-login",
"aadhaar-face-verify"
],
"loginHint": "abha-address", "loginId":
"VTwOF8Fz8KKr0/EsUIgVoF9bSyI2INUer7a3nqEMqWFSimSK67oJ6jRZxzo4bR5fbqLUyHAphK9/seSkOWUPj7f2yij2fmkOJX3PjMb8dooMfvPN4
pBuA627fs8IVaNB1u8fthvjBmdItWocdi2ULXCf7MMBzQzC0FDCO2gk8XF9tohvk1q944svJe/qe4O6tLS494e5Jgm+u+DJ1BN2hhownZbAavLX8g
mNR3AcENH1/hvLR6iomM8dDHa8MtwHMvLiHBWGDCW7pfL9xKANpDMaRcXG/IU4BkUEstOGCHNaMj974XVOhsZOfnVMdwMVvCIJgk7WKs

AoJDzqNq4L1rQfVyKc8sQBULKQcTuPKCjqUGUzOSHzVAaAeFj4PcOa3Nn1AvjNXAjlMqP36iHarJRywccWVNy50p8YSBDhq7iwvZjPJQua7d9eSM
+26TxBnz0rdmEh2mpEKxKUi5RryJFZDovqrZn6lJXg+KUzxyrfhtWD6VGiC9vC/jCZFPbZi83eoBQH71RCO+iVbfj8jgWRPfJjCxkZAar1N2KdaidlUdEa
EG6e7DPIWCGGrucYpTcvTbL12seqm1WswLoplZJm1UBytvCdIk50Ft6MMBOJdY+8kyIF9xZ6b4tudey/UtOFvpiL08y0a+7N5bjHgkHJK3QJ08YXiF
wjbH8OmXQ=",
"otpSystem": "aadhaar"

}

```
V3 Response:
Response Body
```

###### {

"txnId": "4faf0ca4-ce24- 4804 - 8dfa-1dd1c9f0edfb ",
"message": "Face authentication request successfully sent "
}

### Step 3: Verify via Face Authentication

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/verify V 3
Prod URL: https://phr.abdm.gov.in/api/phr/web/v3/login/abha/verify
V3 Request: POST V3 Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

```
Yes Unique UUID for tracking the end-to-end
request transaction
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API (Use ABHA
Public Key)

```
V3 Body Parameters:
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-face-verify

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA-ADDRESS-LOGIN(“abha-address-login")
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
```
MOBILE_VERIFY("mobilePASSWORD_VERIFY("password-verify"), -verify"),^

```
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
authMethods face Yes Type of login, following are the values that can be used

```
OTP("otp"),
PASSWORD("password"),
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
faceAuthPid Encrypted
faceAuthPid value

```
Yes Face auth pid can be generated from the Biometric systems.
```
```
V3 Request Body:
```

Request Body^

{
"scope": [
"abha-login",
"aadhaar-face-verify"
],
"authData": {
"authMethods": [
"face"
],
"face": {
"txnId": " _{{txnId}}_ ",
"faceAuthPid": " _{{faceAuthPid}}_ "
}
} }

```
V3 Response: Response Body
```
{
“txnId” : “4faf0ca4-ce24- 4804 - 8dfa-1dd1c9f0edfb"
"message": "Face verified successfully",
"authResult": "success",
"users": [

{
"abhaAddress": "singh128@sbx",
"fullName": "Deepak Kumar Singh",
"profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc
5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADIAKA
DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1
FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJip
KTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBddAQEBAQAA
AAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8Rc
YGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6
wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD0iP8A1eDxVec5Zf5VZjyI6pz8Sgikxlu1bC/jU12N0ecda
q2zckGr0hDQcj9aBGLgs2CehqrJG6kH+tX9hCFjnls1DKoK8UmCLGn3RUBWIwTxWrMglTd/EB2rm4yQoK8EVU1X4g6ZokDqN11epx9nj4AOD958
YAyMcZPI4xQgZ0ByjH9Kgcqec98dK8j1L4ia3fO+yaO0Rn3BIkxgAkhcnJ9M9M47A4rBm8Q6nNJI0uo3j7uqm4Yr2/hzgcj0qrEnu4ZQ6qzhc9ATU9t
dW91u8qaOTyzhtrA7T6GvnR7p55WkmJeU5yzHJNXdJ1/UtIlV7C5kjI6qDlG6dV6HoKdhan0KF6HnjpSk8dOa8z0X4qkziHWLRAhIAmtVI29OWUk
5HUkg/QGvRrS6ttQtUubWZJYZBlWQ8H/6/t2pWAVgRzT1YZw2R9aXtj3ppHNTYdx5QHhc1HnaeOmalRuR+lEy7geaAuRg+Zj3NS45z+tRwr8/P1q
ww5xjpQIgQ4Rc1SuGPmeuPernRQOlULhv334U2WWLU/P1xWiuXhZe9ZVu2GArShJLDnmhAyCdAImA4IYf1qk2OQa1rjBDcYyfSsPU547KxuLqX
/Vwxs5AOCcDOB7npQCOX8X+IBpEAs7fY13MN3zHiNMn5j7nBA/E9sHyqVmcks5Yn5mYkknnOSe5JqXU9Sub+9luLiQPcTHLsowOmMD2AAFVft
CoQe4IODyO3+AqkrCeo1iSyk9CcDPQUx1cHkdOKZPM7jauNmBgd8460i3TeUMhlbswOPagROqBDHI7YDnHP+f84okfylcRn5ZAQRgHHeqbSmQ
4JNPVgq4DZNMC3FsYK27B24INb3hfX7nQb9SlzIsDZEsAb5G9yNp5+UdBuxwCM1zStu4yMgcg96kLkRdTx3oQmfR8F5FPEs8TM8LjKsoyCD0I/CrJ
OGyORjPFeQeAPFMlpfxabdyj7LMSsRfA8uQ8jn0Y8Y9SOnOfX1IK49vWoasAbgSO3NSody//AF6heMs+R0AzmlG4de9AEsSfOT7Yp8jAZOe3rSRN
8hPPWq87/P1oAU7cgYPNZ1wf33XoKvE45wc1QuTmc/Shlj0bBBrStm/eAknkYrKVuB2rRtvuA+9JAy9KuYnOORg15x8TNSS00iCzVmWW4kLAYH


Kp19+pX/PB9JJzCx9V5/MV4v8AFu5Ya1a2naO38wc/32IP/oA/KqWrEedsdzZGSSeKb5Eu4DYSTWlp+nNcmOQjCLzn1PYV0FvpgfG/is51eU1hSclc
5uPTyiqW5c9vSrFxo5KjyfmH0rqhpcAjHXcDkc062shJI5JI9Kx9q3qa+yRxCaLcu+1UA9SxGKcNDugWI2hlPX196719MBHEuPwqv/Z+GIZ24odeQlR
Rwx064hbE0LlM8shyaY6ELgZ6Z5FdyLVkzlcg1k3ejQiGeRdwfJK4PGPp+n4CrjXvuRKjbVGHZSSQTJPC+yWJ1ljYqCAwOQcH3r6B0a/Gq6RaX6AAT
RhmVSSFboy9OxBH4V8+qNr8dDwQa9p+Hx/4pK2HGEeReOud5PP5/rW7Oc6xeTnP5ikcDGc0zO09aR5cKfpSAXzCqKvBIGagkJLZJpSSVU8520wJ
xk0rjJzyTVC4/wBaSfQd6vNg9KoXX+u6HOM02UhAcJ26Vo2hJQA1mLyMetX7Y9APSkhmsnzQkHHCmvE/ivbtJ4xt1XlntI1/8feva7Y9QO/pXm3xJ0
wtrelajsBjCNHIQeQVyy/hkmne2okruxwLajDpgFtCnmNHwSR3pv8Awk/P+rAqlcpGs5LKXdzwq96q3JEbyRNaxAxgbvmGeSBx69e38hWSjF9DZya
OotNaSfBIxxnrWjFfxldy9a4lUktHTIwHTcvPVT/+uuh0kPduqIo98nAFZzikawbka8+rJEhODWRP4lVJCAvTvWhfWaGAYGX7g1ysySGGW6ESiKIgcjk
knFKCT6Cm2jU/4SV5flRCPQj/AAq5a36XR8mRMMw4PY1k6IZb0z7PsYaFA/lySpGz5/hQMRubPpx7jjOxp/2W62lIvKkQ/dxirnBJbERcn1MLVrVrC
7BXmKUEr6g16h8MyD4bnwuD9rbOR1+RK4jxJb5toX7K5X3yR/8AWNd/4JeDTvDGmWd1dQJe3CtMkTzAM6s7FSq5z0x075rSnK8NTGpFKWh1
BGD+NMf5lIp5Py9e4qM/cYZqiBxHC8/wigDjJHFOPCqR/dFAGB14oAZ1Bqjdn97+Aq6MY61SvMCUfSqKI4zkjNXbZhuxVGM4P06VZhbDUhl29vm
0/Sry8jUM8EDyIrdCyqSAfbIAry6TxHfa/bmO9lZyjliNgUDP8IwBkDHGeeeTXoevI03hnUFV9m2BnPy5yFGSMe4GK8js5PKMq9w/P5VFTY1pJDL7T
Nj+YqHnkGs+S086YPIm5/U966iO485dhXcPQ02SwXBZSK51Jo3cEzCuUMqjcCzYwATwtbnh+3WEOWXLAE498VTNuwlACZxzWvpbAK4x8xFKU
my4QSFvIBMCFJB9fSsWbT5MOrEkMMEZO1h06fhW5JuVhgZz2qJx5pPNTFtbBON2ZGn2MdtvQwgLJjeoPDY6Z9a2ocCQOiAZ74pkac8rkVoQR8
YCfhTcmyOVGPr0Kz6Y5IxsZWz6c4J/LNOnsorfSs2pbKgEk/xAYXn1GO3oBVjXCsWn3Oe8ZFULG6uL+D7NtMjy7FAB6ncKuF0hxS5j1Kzme4062mf
78kKO3bkqCf1qbOR/SnbVVQiYCjgD0FNcHbk9RXScD3Js8Jj+6P5U5Ey1IQfl7DA/lViJcHNMkzt3yjk1TvWyw78Vaz1zVK8IDL9KZZHG3P41Oh+aqc
ZwAfWrKngUhmtbtwvQ9+RxXiF/bPpev3ljIZModqtIMF1XgNj/AGh83417VA2VXJ7dK8w+Jdr9l8QWV8sQVbiAo7LjDMh7++CoyeoAHak1cqErMy
reXB4OM/rWpHMWXk4xXORS7nGCM4qxNqItVy5+g9a5GjrUtNSXUri4gmBhk2hxj7u7n3FQ2OrzJIVl+96Doaz7rUJLtMoNqjuTSWrHbt+1J0PynI/
HpVKOmoOfY6afUbiTaYikZHUMuT/Pj9asW7M0Yckbj14rlTDli320lvXbxVyK5u7aMFZUk4/vA59qTg+gufudVCcnJq0JtuR7c5rE0i/N2WDoVdTyK0
p5dpwOvvSSa3E3fYyPE9zi0Ma/xHn271t+ENPD3lsRDiK2VJZGBPLgZHP17egNcrr7iUooI3M3TIGeK9U0PTf7MtDHIf3r4LKOgwOnP41rGOiM5VLX
Ncjqe1NY4XmpguV2kD61E4KoQRxW5ylkgAgZ4CipF4OfemMfXNLvGMCgRlZwuQc1Tvuin8KgjvSpCtyKLiUSAFT7mmWIp6Ampt2B14qoGxU6nK
8UhmpbvkZrk/ig2nJ4aRrqULdCUG1QY3OejAcfdAIJPHReckA9FaSYbHrXiHjrXJNZ8Q3Mm8G3jYwwBWBXYpIBBxzu5b8cdqa1EQW10HCkNjjmn3
g85kOc+3pXOW920LYJ4rQXUQQMde1ZTg76G0ZpqzLj2gwD5j49KmgW2jBLk/maLdxKoLEVox20cu3pnPFZObWjNYpdBkD2TN8qHPf5TyfxrRh0
y0mIYqQevNPgtYhwCM9+KslPLjbBBI6AGpcncp7Fi0iis2LKucjAbuKS6uV2gg//AF6x5tQSAsruSe2azrm/lv5FtbX7x647D1NUoNmbkkihr2oiSbYOQ
OPxrufAHjm5uLyLSdWuTL5p2288jZfd2QnvnsTznjnIx5Q/mSEynO1fX0qaGTaQa6opWscsm27n1J5wHTn6ihpgQdy5zXJeAfEv9v6P5Vw+69tQElJ
Jy452vz9MH3GeMiuqYEPGBjafagktsQxOeMe1L3wD09sVH0c4I/wpCc9CfwoEccrE80I2S3NQGXPyjgfzpkl1BZxB7ieOFWIUNI4UEntz3pGpoBuB
UyyZXrXHX3jfTrdf9GD3Uh7AFFHPOSRn16AiuR1LxRqeqxGKeVY4SMNFCCqt165JJ+hOPamotiueiX/jXStIkdDK1xOh2mKEZweRgnoMEYIzkeleLXJ
OxSxy3c1beTsDiqk53jHtVWsJu5U2GQkjA2jJ+lIVYDcpNWbaMyxSAE5yMj1H+TV1LVZ4duMHsaiTsVFXZSttSePAOeO9atvrQX+IcCse5s3hIDDr3F
QeU3YZzU2jIu7R0sevlJy5k4FD+Iiwb58DHOOawo9PnlIAQ1rWXhxpCplyc4GB0pWgh3kxtubzWLgrCCF/idjwBXTC2t9I0hzF/rJBjzD95mx/IVPZ2Ed
vEiRRKiAYb1b3qhrNwJpvLB+WPgD371lKd9FsXCNtWc7HbbVLRyb8ZLIR09R78VQbCSMozgHjNaUGY9Rjbbnc2wj68VlzkrcuD7V0RdzCasze8N63
NomrwXsLNhGxIinHmIT8yn6jpnoQD2r3zTtTs9VEdxYXkdxGMhijZ2nGcMOqn2PNfNCMVINa1ndukkc0TsksZ3I6nBU+oPUVdrmZ9Kbxk54NJvPX
NeLad4/1uwi8ozx3SAAD7UhcqM8ncCGJ/wB4ntXV2nxPsHAW6sbiIlsAxssigepJ2n8gaVmB5/feL9Tu2YROtvEQQEjHOM8fMecj1GKw5rmSeUyzS
PJIQMu7FmOPUnk1DuzTGfHFUtB3JS/NBO0e9Qockk9B+poL9WJ4HTimAvmKyMSeSagzTHmeU/M5IHanEkYypG4ZBPcVIFrSkEgZQrbg2WfPAB
wB+ua0LfKcnr3rM0qQQ3wZlLKeCB35B/pWyYfKdkP8JxxWVXY1pkrwpPGQetURAIyV2DFX14FIxBzuArnTsbWG2hjiOWUn8K1oNRgQc5A+lZWV
HTNAIznGfrQxrQ2p9UBjKwKRn+Nuv4ViTNn8aeXJ47VE57VKQ2yvChNxvHVAzgeu0E/0rGviBeOAOwrZkZY4JmL7XCgrzjPzKD9eDXPyuZZ5H5OT
3HNdVNdTnqPUlU8VPBJsb2qslSKpzwa1MjUVxjOc5pokJbGagtyxVlBXOOmRTg2000xEDuFGO9RAl2wO9MeTn3qSMbFyeppgSE4GBTHI24oP60
08jHegCsMiVl/KpzIGjVQoG3PIHXPr/ntUcq5USr1BwaRCDg5wO9SMntZBBNHKygqGyQe4rpopI7q3injBww2sDk4I+vttP41ysxwvHTNXLSe6itowi
pIhBKgnBQkgFhg99o4Pp0qakboqEknqbwG047UrICM0yQX+n2cE91AksE2dr55XjI5Axz2z1wa2JbOIQQ3NsxktZlyjHqD6HGcH/wCv6VyyjY6ktL9
DE8o5OMmnrEfStFIkzyPwqQxIBwKi4+Uy3Vh8oGSaa0YjjLvx3JxV5wse6RzgDms+7mV32siYxxubdz1BG3ofzq4RuRN8pl3tw7QtH0jJD4+mQD+tY
yncxPqa1NWmMwj3feIwfw//AF1lxjAJrqSsjnbuyZTipkOSFGASccnH61XU54HJpwdlYrHy+MMfSmIuxMVmwnBHDEjkeopzgo2e1VYsRsrDlT1q3
MflVvamiSgi7m3H8KlzgYpF+VajZ+1OwEgOTRSL0pTwDQA1SAxLDKng1Hs2SFCflb0qQYC81GkqnMUnT+E+lFhiKp5V25x0q9pXlmKXc4Lo67Yz/E
DnJ/DA/Oqb7lHzH5h6dxS2IxeBQ2N4OPr2/M4H40WBHoGipFrGm3ehzkeZGDLbSkdBnr06ZwT3O49qg0V90V54cvmaB5CfIc53RSjsMfTPUA4I5
3Vnafqb2GpwXcsYZ4MAnsVxt/Dj+ddD4x09Fjg1qykX5Cu6RD1H8DZ9umfcdhWE1Z3R14aaknSns/wZw0+qarpt7JbXD5eIlGR1Hb9T/Wl/4Sq9/w
CeVv8A98t/jWz4pgTWNHtvEVui7wBDd7R0boG/kOvQr71xgBLBR1JqlGMtbGMnOD5Wzo7e9uLyF7m8dYrcsFAVe/tnk097q3WcvHC3ltlVSRSR+
f4jvU9va+XYwTShsDzI0T+FcKw/MnnP/wBfNK6nAFydoI2kx8fxFh/QVSilsQ5XMm7umvLxpXJ696jfbu+Xv2qNQeQAWbvjoKUq3KsdvriqsK4u7ad
q8noTipYR5Qz1zTFI4XtW7o81tCjRypaFpfkeS4G7bGepUdm9CORmk9NQtcyQ+OR91utWV+aLbnPoarzmJLqVISXg3kRswwSueD+VOhkAG3Ocd
DTRLREWwKYOuTSnByM8H1qMPwenPSmBOp4pCcnFMRyeg4pw+lCAZI3BUdqgYc1O696ZsBHNKwCCXKBH7cqaYrNHICDhlOQfQ0pQldppqno
rnr0Y9qBnZHy57ZLvLMZY9zAnOD0A/DArUSyvdc8NfYoZYg0E2FWQkgrgHrzg84GO2R3rmNH1GS2WOJiDggjeMhTnIHPbv+NdX4dLW2q3Fm7b
hMvyPggsV5BH1BJ/AUn5AnYp+E1KyahoN+QkdyrBlJyVYcEL2zjnP+zXHR2UsGp3Fu+0TW/mAkHIDLn+orrtZLaR4rivsEKzLKwVcZ7OPqRn/vqovE
Nt9n8SSXaEK00Ak25BzyVwMdiB+PNZxbvqdNeMbRlHZorjzJxaRRkkbGLAHP3nZcgdM81iX9yJXEMfRV2s3qck/wCH5VYmv5Le3bacOU8tCO3zbs
/nWbABuyep5rVHMSxIETCgAmo5EdznA4qfHGQaQtgbjgUxFMo47VMjgp85Ax2pHnUDCDdz3oijaVwznp0AosMikkYkpH0FOiHl7F3c9TzSL81we
gB5p6jdIGHrSBg+QcbyBRtJXg5oooAQK3oKeMgdCPpRRTADyDz+lJycdDRRQAjLnjGPSqzgkEUUUgL2m/6RN5bfeKn8SOf8a6myN7YFLmR1ZrSVV
2EjewO4kZ9MAjvjI9BRRQxG/wCMbBL3R4r+3YOseJAR/EjAc4/75P0BrjzLNcW6MX3OQsaqO20AL+eTRRWS+I6m70LPozGu23yHByFGKiMsaRKS
2GHpRRW3Q5kRNeyNxGu3PfrTUUyNukYk9hmiikDJ8YHT8qnHywg9Cc0UU2IrRgktipIiGkVQeAfzoooQH//Z",
"abhaNumber": " 91 - 6167 - 8028 - XXXX",

"status": "ACTIVE",
"kycStatus": "VERIFIED"
}
],
"tokens": { "token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJzaW5naDEyOEBzYngiLCJjbGllbnRJZCI6IlRFU1RfQUJIQSIsInJlcXVlc3RlcklkIjoiQUJIQS1XRUIiLCJzeXN0ZW0i
OiJBQkhBLUEiLCJtb2JpbGUiOiI5MzQwMjM5MTI3IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjAwNjczNzMsImhlYWx0aElkTnVtYmVyIjoiO
TEtNjE2Ny04MDI4LTA4ODIiLCJpYXQiOjE3MjAwNjU1NzMsInBockFkZHJlc3MiOiJzaW5naDEyOEBzYngiLCJhYmhhQWRkcmVzcyI6InNpbmdoMT
I4QHNieCIsInR4bklkIjoiZTFkYmI3ZTAtYzliNi00NDUwLTkyZmEtOGNlMmVjZGY2OWI0In0.JDCwqgAhqG78NbaTdBi94JMxiiS7H9_rSIvhK4UnoFApt0cVNcnE9Q
01041sMNUNFXvKdwKMG45xz15P9ss93Gp8cJh-
0d0ThEk5qNdIgYkcaXYefVOFH5fofLivP3RhotwvYD1rKtgRFNPIKtktOFf2opfcXO5BO736ZK3825LCD6IINgq81m9z4CzzTvbybAoOejLE4AyakJOz4Obr
KeKVOOg9qbLmTbH7rjiKz3Il-bxr46moyazB6YfMWL4FEzvRg13QJS_CMZhY6YSAknp7sH-


##### 14.3.2 ABHA Address Verification via Biometric (Fingerprint)

##### Note : List of UIDAI-approved biometric devices

##### - https://uidai.gov.in/en/ecosystem/authentication-devices-

##### documents/biometrichttps://ind01.safelinks.protection.outlook.com/?url=https://uidai.gov.in/en/ecosystem/

authentication-devices-documents/biometric-
devices.html&data=05|02|Kushal.Pandita@ltimindtree.com|022d6e5cc5ca4c50ddc708dd93aaf31c|ff3552897
21e4dd7a663afec62ab9d54|0|0|638829084605444457|Unknown|TWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRyd
WUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ==|0|||&sdata=l/nQjzqQwmHiwJj++2

##### ueol9Tlnbz1iunxdtKxwPjPLQ=&reserved=0devices.html.(Kindly note that the list is updated by UIDAI

##### periodically.)

### Step 1: Search Auth Methods

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/search V3
Prod URL: https://phr.abdm.gov.in/api/phr/web/v3/login/abha/search
V3 Request: POST
```
```
V3 Request Headers:
Property Name Example Value Mandatory Description
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API (Use ABHA
Public Key)
```
```
V3 Body Parameters:
Property Name Example Value Mandatory Description
```
```
abhaAddress string Yes
```
```
V3 Request Body:
Request Body^
```

###### {

```
"abhaAddress":"singh128@sbx",
}
```
```
V3 Response:
```
Request Body^
{

##### "healthIdNumber": " 91 - 6167 - 8028 - XXXX",

"abhaAddress": "singh128@sbx",
"authMethods": [
"MOBILE_OTP",
"AADHAAR_OTP"
],
"blockedAuthMethods": [],
"status": "ACTIVE",
"message": null,
"fullName": "Deepak Kumar Singh",
"mobile": "******9340"

```
}
Step 2: Send Fingerprint Authentication Request
```
```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/request/otp
V3 Prod URL:
https://phr.abdm.gov.in/api/phr/web/v3/login/abha/request/otp
V3 Request: POST V3
Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API (Use ABHA
Public Key)

```
V3 Body Parameters:
Property Name Value Mandatory Description
```

Scope abha-login,
aadhaar-bio-verify

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA-ADDRESS-LOGIN(“abha-address-login")
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
loginHint abha-address Yes Type of login, following are the values that can be used^

```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
loginId Encrypted ABHA
Address

Yes Actual value of login type. This needs to be RSA encrypted using
public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
Request Body
```
{
"scope": [
"abha-login",
"aadhaar-bio-verify"
],
"loginHint": "abha-address",
"loginId":
"VTwOF8Fz8KKr0/EsUIgVoF9bSyI2INUer7a3nqEMqWFSimSK67oJ6jRZxzo4bR5fbqLUyHAphK9/seSkOWUPj7f2yij2fmkOJX3PjMb8dooMfvPN4
pBuA627fs8IVaNB1u8fthvjBmdItWocdi2ULXCf7MMBzQzC0FDCO2gk8XF9tohvk1q944svJe/qe4O6tLS494e5Jgm+u+DJ1BN2hhownZbAavLX8g
mNR3AcENH1/hvLR6iomM8dDHa8MtwHMvLiHBWGDCW7pfL9xKANpDMaRcXG/IU4BkUEstOGCHNaMj974XVOhsZOfnVMdwMVvCIJgk7WKs
AoJDzqNq4L1rQfVyKc8sQBULKQcTuPKCjqUGUzOSHzVAaAeFj4PcOa3Nn1AvjNXAjlMqP36iHarJRywccWVNy50p8YSBDhq7iwvZjPJQua7d9eSM
+26TxBnz0rdmEh2mpEKxKUi5RryJFZDovqrZn6lJXg+KUzxyrfhtWD6VGiC9vC/jCZFPbZi83eoBQH71RCO+iVbfj8jgWRPfJjCxkZAar1N2KdaidlUdEa
EG6e7DPIWCGGrucYpTcvTbL12seqm1WswLoplZJm1UBytvCdIk50Ft6MMBOJdY+8kyIF9xZ6b4tudey/UtOFvpiL08y0a+7N5bjHgkHJK3QJ08YXiF
wjbH8OmXQ=",
"otpSystem": "aadhaar"

}


```
V3 Response:
Response Body
```
{
"txnId": "4faf0ca4-ce24- 4804 - 8dfa-1dd1c9f0edfb ",
"message": "Fingerprint authentication request successfully sent "
}

### Step 3: Verify via Fingerprint Authentication

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/verify V3 Prod
URL:
https://phr.abdm.gov.in/api/phr/web/v3/login/abha/verify
V3 Request: POST V3 Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

```
Yes Unique UUID for tracking the end-to-end
request transaction
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API (Use ABHA
Public Key)

```
V3 Body Parameters:
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-bio-verify

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA-ADDRESS-LOGIN(“abha-address-login")
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
authMethods bio Yes Type of login, following are the values that can be used

```
OTP("otp"),
PASSWORD("password"),
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.


fingerPrintAuthPid Encrypted
fingerPrintAuthPid
value

```
Yes Fingerprint auth pid can be generated from the Biometric systems.
```
```
V3 Request Body:
```
Request Body^

{
"scope": [
"abha-login",
"aadhaar-bio-verify"
],
"authData": {
"authMethods": [
"bio"
],
"bio": {
"txnId": " _{{txnId}}_ ",
"fingerPrintAuthPid": " _{{_ fingerPrintAuthPid _}}_ "
}
} }

```
V3 Response:
Response Body
```

###### {

“txnId” : “4faf0ca4-ce24- 4804 - 8dfa-1dd1c9f0edfb"
"message": "BIO verified successfully",
"authResult": "success", "users": [

{
"abhaAddress": "singh128@sbx", "fullName": "Deepak
Kumar Singh", "profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc
5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADIAKA
DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1
FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJip
KTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBddAQEBAQAA
AAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8Rc
YGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6
wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD0iP8A1eDxVec5Zf5VZjyI6pz8Sgikxlu1bC/jU12N0ecda
q2zckGr0hDQcj9aBGLgs2CehqrJG6kH+tX9hCFjnls1DKoK8UmCLGn3RUBWIwTxWrMglTd/EB2rm4yQoK8EVU1X4g6ZokDqN11epx9nj4AOD958
YAyMcZPI4xQgZ0ByjH9Kgcqec98dK8j1L4ia3fO+yaO0Rn3BIkxgAkhcnJ9M9M47A4rBm8Q6nNJI0uo3j7uqm4Yr2/hzgcj0qrEnu4ZQ6qzhc9ATU9t
dW91u8qaOTyzhtrA7T6GvnR7p55WkmJeU5yzHJNXdJ1/UtIlV7C5kjI6qDlG6dV6HoKdhan0KF6HnjpSk8dOa8z0X4qkziHWLRAhIAmtVI29OWUk
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",
"abhaNumber": " 91 - 6167 - 8028 - XXXX",

"status": "ACTIVE",
"kycStatus": "VERIFIED"
}
],
"tokens": { "token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJzaW5naDEyOEBzYngiLCJjbGllbnRJZCI6IlRFU1RfQUJIQSIsInJlcXVlc3RlcklkIjoiQUJIQS1XRUIiLCJzeXN0ZW0i
OiJBQkhBLUEiLCJtb2JpbGUiOiI5MzQwMjM5MTI3IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjAwNjczNzMsImhlYWx0aElkTnVtYmVyIjoiO
TEtNjE2Ny04MDI4LTA4ODIiLCJpYXQiOjE3MjAwNjU1NzMsInBockFkZHJlc3MiOiJzaW5naDEyOEBzYngiLCJhYmhhQWRkcmVzcyI6InNpbmdoMT
I4QHNieCIsInR4bklkIjoiZTFkYmI3ZTAtYzliNi00NDUwLTkyZmEtOGNlMmVjZGY2OWI0In0.JDCwqgAhqG78NbaTdBi94JMxiiS7H9_rSIvhK4UnoFApt0cVNcnE9Q0
1041sMNUNFXvKdwKMG45xz15P9ss93Gp8cJh-
0d0ThEk5qNdIgYkcaXYefVOFH5fofLivP3RhotwvYD1rKtgRFNPIKtktOFf2opfcXO5BO736ZK3825LCD6IINgq81m9z4CzzTvbybAoOejLE4AyakJOz4Obr
KeKVOOg9qbLmTbH7rjiKz3Il-bxr46moyazB6YfMWL4FEzvRg13QJS_CMZhY6YSAknp7sH-
12jJd9Pke6TmdWS3LVpz8fRETkVpXlLJ3qs_8eN2SDmaS0WK34KSezAl_6IDAJ3MXyPK6AQD9fEUQoL8n7F2WlIImAkN5Pyq2pLbIKuArfn9gFeywz4v
S7ZgO6v70rC9Nv5qYLwKlWtjYFZZfxa

- g4ub9PC0i6QqLuBhGTlQGiSEGGbRvayEfykAdaA0TE2CQ6MiJmFK5XM1CdolZa8m8iBq56i70CrzfkP4-
QRBwDgPOj8N9uNxnl1OBiLT9FqFVfcqfKtYDZqZ5wwU2qedFeVIzf08BTix7ceOuyWs8zFeMnOIC_FYL5bcfzBByIBv1mqGDjSaFIQaAC5i-ckx9AV4ni0-
- 2Eq3EdghY_EKdZvBkwskBB084iJz6ptp5lrIaEhkXaKuFs",
"expiresIn": 1800 , "refreshToken":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJzaW5naDEyOEBzYngiLCJjbGllbnRJZCI6IlRFU1RfQUJIQSIsInN5c3RlbSI6IkFCSEEtQSIsInR5cCI6IlJlZnJlc2giLC
JleHAiOjE3MjEzNjE1NzMsImlhdCI6MTcyMDA2NTU3M30.Yb4l9jS1OV6h4wovYa24U1KOeiwXrx8nej3c90oVXl4lD4pBh3-
kdnwaloocJhgNnx7GjTlNoQKlCLaoKLJ5kLYClUVFKCTVqEGATicfRDWruIYyTKzlR0E_MvbVFSaOMpatnsMOzbs8c_8xXEtrqEQeW98K4_TWC4gn8goR
hpMenUWqDGTZ4GjnkHhKYBpmXPssPGqLNO3lNXve-
14X4QTdNZyU9PicqkDlFQpL2HDKSmR8jcUk69hY29n_QB9jKBP5vn4f7HO_YtQ1_Btf_bk4okTXSxwwCowRSJhfsf90HMBqf3SdE1Gi3F8tGxMW
Tg3XQdNyx2vlSbfTQxEx7VowHqASRGoNjVZTjKOERMLTvnaxx8gend0jv3oqwRmzqZsXvC2AtyP5QjBDP_dFJy7DaJ0TWn9iwlExiXU5Cuj-
l2hUfyJE6VsMLTsgtQufpDFnNYto_Ob9zZY6PEuNvHg-
c0_9hzoAyj0TZTcW1_rh6yuZqo8pvR_PN40SY6B9FhyxwbbgoDUXqcAxT2J5VtOyrZpAzkzto9sKdJKA1VEEaPh31s-
GfOKPTLkhwG4_bMieCgdPXEbt3oFbcmPzgTIX9NYDWosgvmJVbUAjoz8Hb9ibqsppUcl68ZReRAaRmKmYwajJ6E5dkU5qCsnTXiTpMJNNWpBBaqdH icM",

##### "refreshExpiresIn": 1296000

##### "switchProfileEnabled": false

###### }

###### }

##### 14.3.3 ABHA Address Verification via Biometric (Iris)

### Step 1: Search Auth Methods

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/search V3
Prod URL: https://phr.abdm.gov.in/api/phr/web/v3/login/abha/search
V3 Request: POST
```

```
V3 Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API (Use ABHA
Public Key)

```
V3 Body Parameters:
Property Name Example Value Mandatory Description
```
```
abhaAddress string Yes
```
```
V3 Request Body:
```
Request Body^

```
{
"abhaAddress":"singh128@sbx",
}
```
```
V3 Response:
```
Request Body^

```
{
```
##### "healthIdNumber": " 91 - 6167 - 8028 - XXXX",

"abhaAddress": "singh128@sbx",
"authMethods": [
"MOBILE_OTP",
"AADHAAR_OTP"
],
"blockedAuthMethods": [],
"status": "ACTIVE",
"message": null,
"fullName": "Deepak Kumar Singh",
"mobile": "******9340"

```
}
Step 2: Send Iris Authentication Request
```
```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/request/otp
V3 Prod URL:
https://phr.abdm.gov.in/api/phr/web/v3/login/abha/request/otp
V3 Request: POST
```

```
V3 Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the

month, the day, the hour, the minutes,
seconds, and milliseconds

Authorization Token {{accesstoken}} Yes Token generated from session API (Use ABHA
Public Key)

```
V3 Body Parameters:
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-iris-verify

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA-ADDRESS-LOGIN(“abha-address-login")
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
EMAIL_VERIFY("email-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),
```
loginHint abha-address Yes Type of login, following are the values that can be used

```
ABHA_NUMBER("abha-number"),
MOBILE("mobile"),
EMAIL("email"),
AADHAAR("aadhaar"),
PASSWORD("password"),
```
loginId Encrypted ABHA
Address

Yes Actual value of login type. This needs to be RSA encrypted using
public key
otpSystem aadhaar Yes Otp system to verify hiu/hip/phr login, following are the values can
be used.

```
AADHAAR("aadhaar"),
ABDM("abdm"),
```
```
V3 Request Body:
Request Body
```

###### {

"scope": [
"abha-login",
"aadhaar-iris-verify"
],
"loginHint": "abha-address",
"loginId":
"VTwOF8Fz8KKr0/EsUIgVoF9bSyI2INUer7a3nqEMqWFSimSK67oJ6jRZxzo4bR5fbqLUyHAphK9/seSkOWUPj7f2yij2fmkOJX3PjMb8dooMfvPN4
pBuA627fs8IVaNB1u8fthvjBmdItWocdi2ULXCf7MMBzQzC0FDCO2gk8XF9tohvk1q944svJe/qe4O6tLS494e5Jgm+u+DJ1BN2hhownZbAavLX8g
mNR3AcENH1/hvLR6iomM8dDHa8MtwHMvLiHBWGDCW7pfL9xKANpDMaRcXG/IU4BkUEstOGCHNaMj974XVOhsZOfnVMdwMVvCIJgk7WKs
AoJDzqNq4L1rQfVyKc8sQBULKQcTuPKCjqUGUzOSHzVAaAeFj4PcOa3Nn1AvjNXAjlMqP36iHarJRywccWVNy50p8YSBDhq7iwvZjPJQua7d9eSM
+26TxBnz0rdmEh2mpEKxKUi5RryJFZDovqrZn6lJXg+KUzxyrfhtWD6VGiC9vC/jCZFPbZi83eoBQH71RCO+iVbfj8jgWRPfJjCxkZAar1N2KdaidlUdEa
EG6e7DPIWCGGrucYpTcvTbL12seqm1WswLoplZJm1UBytvCdIk50Ft6MMBOJdY+8kyIF9xZ6b4tudey/UtOFvpiL08y0a+7N5bjHgkHJK3QJ08YXiF
wjbH8OmXQ=",
"otpSystem": "aadhaar"

}

```
V3 Response:
Response Body
```
{
"txnId": "4faf0ca4-ce24- 4804 - 8dfa-1dd1c9f0edfb ",
"message": "Iris authentication request successfully sent "
}

### Step 3: Verify via Iris Authentication

```
V3 Sandbox URL:
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/abha/verify V 3
Prod URL: https://phr.abdm.gov.in/api/phr/web/v3/login/abha/verify
V3 Request: POST V3 Request Headers:
Property Name Example Value Mandatory Description
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8

Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by the
month, the day, the hour, the minutes,
seconds, and milliseconds
Authorization Token {{accesstoken}} Yes Token generated from session API (Use ABHA
Public Key)


```
V3 Body Parameters:
Property Name Value Mandatory Description
```
Scope abha-login,
aadhaar-iris-verify

```
Yes Defines the scope of the current action of the API, following are the
values that can be used
```
```
ABHA_LOGIN("abha-login"),
ABHA-ADDRESS-LOGIN(“abha-address-login")
ABHA_PROFILE("abha-profile"),
AADHAAR_VERIFY("aadhaar-verify"),
AADHAAR-BIO-VERIFY(“aadhaar-bio-verify")
AADHAAR-FACE-VERIFY(“aadhaar-face-verify")
AADHAAR-IRIS-VERIFY(“aadhaar-iris-verify")
EMAIL_VERIFY("email-verify"),
MOBILE_VERIFY("mobile-verify"),
PASSWORD_VERIFY("password-verify"),
```
CHANGE_PASSWORD("change-password"), RE_KYC("re-kyc"),^

authMethods iris Yes Type of login, following are the values that can be used

```
OTP("otp"),
PASSWORD("password"),
```
txnId txnId Yes Transaction Id is Mandatory to identify the unique transaction for
ABHA login.
irisAuthPid Encrypted
irisAuthPid value

```
Yes Fingerprint auth pid can be generated from the Biometric systems.
```
```
V3 Request Body:
```
Request Body^

{
"scope": [
"abha-login",
"aadhaar-iris-verify"
],
"authData": {
"authMethods": [
"iris"
],
"iris": {
"txnId": " _{{txnId}}_ ",
"irisAuthPid": " _{{iris_ AuthPid _}}_ "
}
} }

```
V3 Response:
```
```
Response Body
```

###### {

“txnId” : “4faf0ca4-ce24- 4804 - 8dfa-1dd1c9f0edfb"
"message": "IRIS verified successfully",
"authResult": "success",
"users": [

{
"abhaAddress": "singh128@sbx",
"fullName": "Deepak Kumar Singh",
"profilePhoto":
"/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc
5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADIAKA
DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1
FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJip
KTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBddAQEBAQAA
AAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8Rc
YGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6
wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD0iP8A1eDxVec5Zf5VZjyI6pz8Sgikxlu1bC/jU12N0ecda
q2zckGr0hDQcj9aBGLgs2CehqrJG6kH+tX9hCFjnls1DKoK8UmCLGn3RUBWIwTxWrMglTd/EB2rm4yQoK8EVU1X4g6ZokDqN11epx9nj4AOD958
YAyMcZPI4xQgZ0ByjH9Kgcqec98dK8j1L4ia3fO+yaO0Rn3BIkxgAkhcnJ9M9M47A4rBm8Q6nNJI0uo3j7uqm4Yr2/hzgcj0qrEnu4ZQ6qzhc9ATU9t
dW91u8qaOTyzhtrA7T6GvnR7p55WkmJeU5yzHJNXdJ1/UtIlV7C5kjI6qDlG6dV6HoKdhan0KF6HnjpSk8dOa8z0X4qkziHWLRAhIAmtVI29OWUk
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",
"abhaNumber": " 91 - 6167 - 8028 - XXXX",

"status": "ACTIVE",
"kycStatus": "VERIFIED"
}
],
"tokens": { "token":
"eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJzaW5naDEyOEBzYngiLCJjbGllbnRJZCI6IlRFU1RfQUJIQSIsInJlcXVlc3RlcklkIjoiQUJIQS1XRUIiLCJzeXN0ZW0i
OiJBQkhBLUEiLCJtb2JpbGUiOiI5MzQwMjM5MTI3IiwidHlwIjoiVHJhbnNhY3Rpb24iLCJleHAiOjE3MjAwNjczNzMsImhlYWx0aElkTnVtYmVyIjoiO
TEtNjE2Ny04MDI4LTA4ODIiLCJpYXQiOjE3MjAwNjU1NzMsInBockFkZHJlc3MiOiJzaW5naDEyOEBzYngiLCJhYmhhQWRkcmVzcyI6InNpbmdoMT
I4QHNieCIsInR4bklkIjoiZTFkYmI3ZTAtYzliNi00NDUwLTkyZmEtOGNlMmVjZGY2OWI0In0.JDCwqgAhqG78NbaTdBi94JMxiiS7H9_rSIvhK4UnoFApt0cVNcnE9Q
01041sMNUNFXvKdwKMG45xz15P9ss93Gp8cJh-
0d0ThEk5qNdIgYkcaXYefVOFH5fofLivP3RhotwvYD1rKtgRFNPIKtktOFf2opfcXO5BO736ZK3825LCD6IINgq81m9z4CzzTvbybAoOejLE4AyakJOz4Obr
KeKVOOg9qbLmTbH7rjiKz3Il-bxr46moyazB6YfMWL4FEzvRg13QJS_CMZhY6YSAknp7sH-


## 14.4 Profile

#### 14.4.1 Get ABHA address ABHA Profile

###### V3 SBX URL:

```
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/profile/abhaprofile
V3 Prod URL:
https://phr.abdm.gov.in/api/phr/web/v3/login/profile/abhaprofile V3
Request: GET V3 Request Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Response:
Response Body
```

###### {

"abhaAddress": "hemanttest@abdm",
"fullName": "Hemant Prakash Bodhai",
"profilePhoto":
"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
MUUUgLAYyBSDk45zUZIwNxxjmiihAf//Z",
"firstName": "Hemant",
"middleName": "Prakash",
"lastName": "Bodhai",
"dayOfBirth": " 24 ",
"monthOfBirth": " 11 ",
"yearOfBirth": " 1998 ",
"dateOfBirth": " 24 - 11 - 1998 ",


"gender": "M",
"email": "hemant.bodhai@XXXX.com",
"mobile": "******9995",
"abhaNumber": " 91 - 3837 - 7464 - XXXX",
"address": "house no-620, main road, Nashik, Nashik, Maharashtra",
"stateName": "MAHARASHTRA",
"pinCode": " 422003 ",
"stateCode": " 27 ",
"districtCode": " 487 ",
"authMethods": [
"AADHAAR_OTP",
"MOBILE_OTP"
],
"status": "ACTIVE",
"subDistrictCode": "",
"subDistrictName": "",
"emailVerified": "false",
"mobileVerified": "true",
"kycStatus": "VERIFIED"
}

} (^)

#### 14.4.2 Get ABHA address ABHA card

###### V3 SBX URL:

```
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/profile/abha/phr-
card
V3 Prod URL:
https://phr.abdm.gov.in/api/phr/web/v3/login/profile/abha/phr-card
V3 Request: GET V3
Request Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
```
```
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Response:
```

Response Body^

ABHA Card

#### 14.4.3 Get QR Code

###### V3 SBX URL:

```
https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/profile/abha/qr-
code
V3 Prod URL:
https://phr.abdm.gov.in/api/phr/web/v3/login/profile/abha/qr-code
V3 Request: GET V3 Request Headers:
Property Name Example Value Mandatory Description
```
```
REQUEST-ID 18235d89-cb13-479d-ad71-
7a57d5f669a8
```
```
Yes Unique UUID for tracking the end-to-end
request transaction
TIMESTAMP {{$isoTimestamp}} Yes The actual time when the request was
initiated, ISO 8601 represents the date and
time by starting with the year, followed by
the month, the day, the hour, the minutes,
seconds, and milliseconds
```
```
X-token Bearer X-token Yes X-token of user, user can get X-token after
login to the system
```
```
Authorization Token {{accesstoken}} Yes Token generated from session API
```
```
V3 Response:
```
Response Body^

QR Code (^)


