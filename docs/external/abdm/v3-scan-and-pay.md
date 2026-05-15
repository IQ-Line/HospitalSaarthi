# Scan and Pay

> Source: ABDM Sandbox V3 Documentation
> File: Updated_scan_and_pay_11_8_2025_5421e4d9d8.pdf

# SCAN AND PAY DOCUMENTATION 

## (ABDM_Milestone 2) 

## Version 1.0 

## Created On 11.08.2025 

## Contents 

###### 1 Base URL and X-CM-ID ........................................................................................................................ 3 

###### 2 Terminology Definition: ...................................................................................................................... 3 

###### 3 Workflow of Scan and pay .................................................................................................................. 3 

###### 4 Scan and pay ....................................................................................................................................... 3 

###### 4.1 Overview .................................................................................................................................... 3 

###### 4.2 List of APIs.................................................................................................................................. 3 

###### 4.2.1 SHARE_OPEN_ORDER ........................................................................................................... 3 

###### 4.2.2 SHARE_OPEN_ORDER – Callback .......................................................................................... 6 

###### 4.2.3 ON_SHARE_OPEN_ORDER .................................................................................................... 9 

###### 4.2.4 ON_SHARE_OPEN_ORDER – Callback ................................................................................. 13 

###### 4.2.5 PATIENT_ SELECTION ........................................................................................................... 16 

###### 4.2.6 PATIENT-SELECTION – Call back ........................................................................................... 19 

###### 4.2.7 PATIENT_ON_SELECTION ..................................................................................................... 23 

###### 4.2.8 PATIENT_ON_SELECTION – callback .................................................................................... 28 

###### 4.2.9 PATIENT_SHARE_NOFITY ..................................................................................................... 33 

###### 4.2.10 PATIENT_SHARE_NOTIFY – call back ............................................................................... 35 

###### 4.2.11 PATIENT_SHARE_ON_NOTIFY ......................................................................................... 38 

###### 4.2.12 PATIENT_SHARE_ON_NOTIFY – callback ......................................................................... 40 

###### 4.2.13 PATIENT_SHARE_ORDER_STATUS ................................................................................... 42 

###### 4.2.14 PATIENT_SHARE_ORDER_STATUS – callback................................................................... 44 

###### 4.2.15 PATIENT_SHARE_ON_ORDER_STATUS ............................................................................ 46 

###### 4.2.16 PATIENT_SHARE_ON_ORDER_STATUS – callback ........................................................... 48 

###### 4.2.17 Get all details .................................................................................................................. 51 

###### 4.2.18 Update Scan and pay version .......................................................................................... 55 

###### 4.2.19 Get all provider details .................................................................................................... 57 



---

###### 5 Error code listing ............................................................................................................................... 59 

###### 6 HIMS Error List .................................................................................................................................. 61 



---

### 1 Base URL and X-CM-ID 

##### Environment Base URL X-CM-ID 

##### Sandbox https://dev.abdm.gov.in Sbx 

##### Production https://apis.abdm.gov.in Abdm 

### 2 Terminology Definition: 

###### Bridge ID: Is client ID which provided by NHA to HIP (Its alphanumerical eg: SBX_00XXXX) 

###### Service ID: Is Facility ID which is generated from NHPR application (Its alphanumeric eg: 

###### IN02100000XX) 

### 3 Workflow of Scan and pay 

## 4 Scan and pay 

### 4.1 Overview 

###### The patient or end-user can log in to the PHR application and use the "Scan and Pay" feature by 

###### scanning the facility's QR code. After scanning, the user will receive the outstanding payable amount 

###### for the services. The user or patient can then select the services and complete the payment using the 

###### HMIS payment gateway. 

### 4.2 List of APIs 

#### 4.2.1 SHARE_OPEN_ORDER 

##### This API will be invoked from the integrator application (any PHR application, just like 

##### ABHA) to share the user/patient payment details with HMIS/LIMS. 

###### URL: /api/hiecm/scan-gateway/v3/patient/share/open-order 

##### Method: Post 

##### Request Headers: 



---

###### Property Name Example Value Required Description 

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-HIU-ID HIU_ID Yes Identifier of the health information user to which the request was intended 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

 X-AUTH -TOKEN Bearer eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJna XJpamFAc2J4IiwiY2xpZW50SWQiOiJQS FItV0VCIiwicmVxdWVzdGVySWQiOiJrX 2hpcCIsInN5c3RlbSI6IkFCRE0iLCJtb2Jp bGUiOiI4MjgxMTQ3MDgwIiwiZXhwIjoxNj c3NjY5NDU1LCJpYXQiOjE2Nzc2NjIyNT WcFeWA 

 Yes JWT Access token which was issued by PHR service after successfully user authentication. If HIP does not have any role, then it is mandatory. 

 REQUEST-ID {{guid}} Yes Random UUID A v4 style guid 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

##### Body Parameters 

###### Property 

###### Name 

###### Example Value Required Description 



---

 intent "OPEN_PAYMENT_ORDER" Yes The intent is used for the purpose. 

 metadata { "hipId": " {{hip-id}} ", "counterId": "123-456" }, 

 Yes This is meta data for hipid and counterid. 

 profile "profile": { "patient": { "abhaNumber": {{abhanumber}}, "abhaAddress": sample@sbx ", "name": "Full name", "gender": "M", "dayOfBirth": "12", "monthOfBirth": "07", "yearOfBirth": "1992", "address": { "line": "string", "district": "PUNE", "state": "MAHARASHTRA", "pincode": "412***" }, "phoneNumber": "98765*****" } } } 

 Yes Consists of demographics details of the user/patient. * Gender : M/F/O 

##### Request Body 

###### Request Body: 



---

 { "intent": "OPEN_PAYMENT_ORDER", "metadata": { "hipId": " {{hip-id}} ", "counterId": "123-456" }, "profile": { "patient": { "abhaNumber": {{abha-number}}, "abhaAddress": " sample@sbx ", "name": "Full name", "gender": "M", "dayOfBirth": "12", "monthOfBirth": "07", "yearOfBirth": "1992", "address": { "line": "string", "district": "PUNE", "state": "MAHARASHTRA", "pincode": "412115" }, "phoneNumber": "76786******" } } } 

##### Response 

###### Response: 

 Code: 202 ACCEPTED 

#### 4.2.2 SHARE_OPEN_ORDER – Callback 

##### This is a callback API for payment share. This API need to implement by HIP. 

##### URL: {callback_url}/v3/patient/share/open-order 

##### Method: POST 

##### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 x-hip-id HIP_ID Yes Identifier of the health information provider to which the request was intended 



---

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O 

 WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 request-id {{guid}} Yes Random UUID A v4 style guid 

 timestamp {{$isoTimestamp}} Yes ISO TIMESTAMP 

##### Body parameters 

###### Property Name Example Value Required Description 

 intent "OPEN_PAYMENT_ORDER" Yes This is a key value pair which contains the purpose 

 metadata { "hipId": "TestClinicHIP33_1", "counterId": "123-456" }, 

 Yes This is a key value pair which contain the hip Id and counter Id. 



---

 profile { "patient": { "abhaAddress": " sample@sbx ", "name": "Full name”, “gender”: “M”, “dayOfBirth”: “12”, “monthOfBirth”: “07”, “yearOfBirth”: “1992”, “address”: { “line”: “string”, “district”: “PUNE”, “state”: “MAHARASHTRA”, “pincode”: “412***” }, “phoneNumber”: “76786*****” } } 

 Yes This is consisting of patient/user details. Gender: M/F/O. 

##### Request Body 

###### Request Body: 

 { "intent": "OPEN_PAYMENT_ORDER", "metadata": { "hipId": "TestClinicHIP33_1", "counterId": "123-456" }, "profile": { "patient": { 

###### "abhaAddress": " sample@sbx ", 

###### "name": " full name", 

###### "gender": "M", 

###### "dayOfBirth": "12", 

###### "monthOfBirth": "07", 

###### "yearOfBirth": "1992", 

###### "address": { 

###### "line": "string", 

###### "district": "PUNE", 

###### "state": "MAHARASHTRA", 

###### "pincode": "412****" 

###### }, 

###### "phoneNumber": "9887*****" 

###### } 

###### } 

###### } 



---

##### Response 

###### Response: 

 Code: 200 OK 

#### 4.2.3 ON_SHARE_OPEN_ORDER 

##### This is an API called by HIP to HIE-CM to send all the open order for patient. 

##### URL: /api/hiecm/scan-gateway/v3/patient/on-share/open-order 

##### Method: POST 

##### Request Headers: 

###### Property Name Example Value Required Description 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 



---

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

 REQUEST-ID {{guid}} Yes Random UUID A v4 style guid 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

###### Body Parameters 

###### Property 

###### Name 

###### Example Value Required Description 

 intent "OPEN_PAYMENT_ORDER" Yes This is a key value pair which contains the purpose 

 abhaAddress sample@sbx Yes Abha address of the patient. 

 patientUid "string" no Patient Uid. 



---

 Procedures { "category": "OPD consultation", "services": [ { "name": "consultation", "serviceId": "Computerized 2", "description": "Albumin 24 hrs Urine", "amount": 629.00 } ] }, 

 Yes It contains different types of procedures. 

 Category should be: OPD consultation, Laboratory and Diagnostics, Pharmacy, Miscellaneous/Other 

 response { "requestId": "93926800**42c3-a0ae-12cdbf473aac" } 

 Yes Unique guid id. 

##### Request Body 

###### Request Body: 

 { "intent": "OPEN_PAYMENT_ORDER", "abhaAddress": " sample@sbx ", "patientUid": "string", "procedures": [ { "category": "OPD consultation", "services": [ { "serviceId": "Resistance 1", "name": "Activated Protein C Resistance.", "description": "Consult with a hematology specialist to assess for Protein C resistance", "amount": 629 } ] }, { "category": "Laboratory and Diagnostics", 



---

 "services": [ { "serviceId": "Flowcytometric 2", "name": "Flowcytometric Enumeration Of Haematopietic Stem Cells 1", "description": "989261250000094 2; date:06-May-2025", "amount": 629 } ] }, { "category": "Pharmacy", "services": [ { "serviceId": "Tomography 1", "name": "Cbct (Cone Beam Computerized Tomography)", "description": "A high-resolution 3D imaging scan used primarily for dental.", "amount": 629 } ] }, { "category": "Miscellaneous/Other", "services": [ { "serviceId": "Computerized 2", "name": "Cbct (Cone Beam Computerized Tomography) 2", "description": "A high-resolution 3D imaging scan used primarily for dental.", "amount": 129 } ] } ], "response": { "requestId": "93926800-325d-**-a0ae-12cdbf473aac" } } 

##### Request Body : Error scenario 

###### Request Body 

 In case of any error or FAIL then only send error object "error": { "code": “1000”, "message": "string" }, "response": { "requestId": "93926800-325d-42c3-a0ae-12cdbf473aac" } 



---

##### Response 

###### Response: 

 Code: 202 ACCEPTED 

#### 4.2.4 ON_SHARE_OPEN_ORDER – Callback 

##### This is a callback API for patient on-share. This Api needs to implement by HIU for receive 

##### all the open order. 

##### URL: {callback_url}/api/v3/patient/on-share/open-order 

##### Method: POST 

##### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 request-id {{guid}} Yes Random UUID A v4 style guid 

 timestamp {{$isoTimestamp}} Yes ISO TIMESTAMP 

 x-hiu-id Hiu_id Yes Identifier of the health information user to which the request was intended 

##### Body parameters : 

###### Property Name Example Value Required Description 



---

 intent "OPEN_PAYMENT_ORDER Yes Which contains the purpose 

 abhaAddress sample@sbx Yes Patient ABHA address against which the health records need to be linked 

 patientUid "string" no Patient Uid. 

 procedures { 

 "category": "OPD consultation", 

 "services": [ 

 { 

 "name": "ffegconsultation", 

 "serviceId": "Computerized 2", 

 "description": "Albumin 24 hrs Urine", 

 "amount": 629.00 

 } 

 ] 

 }, 

 Yes It contains the different types of procedures. 

 Category should be: OPD consultation, Laboratory and Diagnostics, Pharmacy, Miscellaneous/Other 

 response { "requestId": "37ba8d92ef3c***9d4ff25c9e50a23b" } 

 Yes Request Id from the /share/open-order api. 

##### Request Body 

###### Request Body: 



---

{ "intent": "OPEN_PAYMENT_ORDER", "abhaAddress": " sample@sbx ", "patientUid": "ma****", "procedures": [ { //category : OPD consultation,Laboratory and Diagnostics,Pharmacy,Miscellaneous/Other "category": "OPD consultation", "services": [ { "serviceId": "Flowcytometric 1", "name": "consultation", "description": "string", "amount": 629.00 } ] }, { "category": "Laboratory and Diagnostics", "services": [ { "serviceId": "Diagnostics 1", "name": "Diagnostics", "description": "string", "amount": 629.00 } ] }, { "category": "Pharmacy", "services": [ { "serviceId": "Pharmacy 1", "name": "Pharmacy", "description": "string", "amount": 629.00 } ] }, { "category": "Miscellaneous/Other", "services": [ { "serviceId": "Other 1", "name": "Miscellaneous", "description": "string", "amount": 629.00 } ] } ], "response": { "requestId": "e17444d4-f148-***-bbfc-b7ee37cf6c96" } } 



---

##### Response 

###### Response: 

 Code: 200 OK 

#### 4.2.5 PATIENT_ SELECTION 

##### This is an API called by HIU to select the all open-order and send to HIP for a payment 

##### request detail. 

##### URL: /api/hiecm/scan-gateway/v3/patient/selection 

##### Method: POST 

##### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 REQUEST-ID {{guid}} Yes Random UUID A v4 style guid 



---

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

 X-CM-ID Sbx Yes Suffix of the consent manager to which the request was intended 

 X-HIU-ID HIU-ID Yes Identifier of the health information user to which the request was intended 

 X-AUTH-TOKEN User Login Token Yes JWT Access token which was issued by PHR service after successfully user authentication. If HIP does not have any role, then it is mandatory. 

##### Body Parameters: 

##### Property 

##### Name 

##### Example Value Required Description 

 intent "PAYMENT_ORDER" Yes purpose 

 openOrderRequestId "fa9e0fa1-43dc-4a49-bdae-********" Yes REQUEST-ID from the /share/open-order API. 

 AbhaAddress sample@sbx Yes AbhaAddress of the user/patient. 

 Procedures { "category": "OPD consultation", "services": [ { "name": "consultation", "serviceId": "Computerized 2", "description": "Albumin 24 hrs Urine", "amount": 629.00 } ] } 

 Yes Which contains different types of procedures. 

 Category should be: OPD consultation, 

 Laboratory and Diagnostics, 

 Pharmacy, 

 Miscellaneous/Other 



---

##### Request Body 

###### Request Body: 

 { "intent": "PAYMENT_ORDER", "openOrderRequestId": "fa9e0fa1-43dc-4a49-bdae-****", "abhaAddress": " sample@sbx ", "procedures": [ { "category": "OPD consultation", "services": [ { "name": "consultation", "serviceId": "service-12346", "description": "Albumin 24 hrs Urine", "amount": 629.00 } ] }, { "category": "Laboratory and Diagnostics", "services": [ { "name": "Diagnostics", "serviceId": "service-12346", "description": "Albumin 24 hrs Urine", "amount": 629.00 } ] }, { "category": "Pharmacy", "services": [ { "name": "Pharmacy", "serviceId": "service-12346", "description": "Albumin 24 hrs Urine", "amount": 629.00 } ] }, { "category": "Miscellaneous/Other", "services": [ { "name": "Miscellaneous", "serviceId": "service-12346", "description": "Albumin 24 hrs Urine", "amount": 629.00 } ] } ] } 



---

##### Request Body : Error scenario 

###### Request Body 

 In case of any error or FAIL then only send error object 

 "response": { "requestId": "93926800-325d-***-a0ae-12cdbf473aac" } 

##### Response 

###### Response: 

 Code: 202 ACCEPTED 

#### 4.2.6 PATIENT-SELECTION – Call back 

###### This is the call back api for the select API. This API needs to implement by HIP to receive all selected 

###### open order. 

###### URL: {callback_url}/v3/patient/selection 

###### Method: POST 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 x-hip-id HIP_ID YES Identifier of the health information provider to which the request was intended 

 authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 request-id {{guid}} Yes Random UUID A v4 style guid 

 timestamp {{$isoTimestamp}} Yes ISO TIMESTAMP 

**Body Parameters:** 



---

###### Property 

###### Name 

###### Example Value Required Description 

 intent "PAYMENT_ORDER" Yes purpose 

 openOrderRequestId "16af88ba-793a-48c7-8ee7-9c0******" Yes REQUEST-ID from the /share/open-order api. 

 AbhaAddress sample@sbx Yes abhaAddress of the user/patient. 

 Procedures { 

 "category": "OPD consultation", 

 "services": [ 

 { 

 "name": "consultation", 

 "serviceId": "service-12346", 

 "description": "Albumin 24 hrs Urine", 

 "amount": 629.00 

 } 

 ] 

 }, 

 Yes Which contains the different types of procedures. 

 All selected open order. 

 Category should be: OPD consultation, Laboratory and Diagnostics, 

 Pharmacy, 

 Miscellaneous/Other 

###### Request Body 

###### Request Body: 



---

{ 

 "intent": "PAYMENT_ORDER", 

 "openOrderRequestId": "16af88ba-793a-48c7-8ee********", 

 "abhaAddress": " sample@sbx ", 

"procedures": [ 

 { //category : OPD consultation,Laboratory and Diagnostics,Pharmacy,Miscellaneous/Other 

 "category": "OPD consultation", 

 "services": [ 



---

 { 

 "serviceId": "Flowcytometric 1", 

 "name": "consultation", 

 "description": "string", 

 "amount": 629.00 

 } 

 ] 

}, 

{ 

 "category": "Laboratory and Diagnostics", 

 "services": [ 

 { 

 "serviceId": "Diagnostics 1", 

 "name": "Diagnostics", 

 "description": "string", 

 "amount": 629.00 

 } 

 ] 

}, 

{ 

 "category": "Pharmacy", 

 "services": [ 

 { 

 "serviceId": "Pharmacy 1", 

 "name": "Pharmacy", 

 "description": "string", 

 "amount": 629.00 

 } 

 ] 

}, 

{ 

 "category": "Miscellaneous/Other", 

 "services": [ 

 { 

 "serviceId": "Other 1", 



---

 "name": "Miscellaneous", 

 "description": "string", 

 "amount": 629.00 

 } 

 ] 

 } 

 ] 

 } 

##### Response 

###### Response: 

 Code: 200 OK 

#### 4.2.7 PATIENT_ON_SELECTION 

###### This is an API is called by HIP to share payment request along with procedures of the patient. 

###### URL: /api/hiecm/scan-gateway/v3/patient/on-selection 

###### Method: POST 

###### Request Headers: 

###### Property Example Value Required Description 



---

###### Name 

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 CJwaHJNb2JpbGUiOm51bGwsImV4c 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID Sbx Yes Suffix of the consent manager to which the request was intended 

 REQUEST-ID {{guid}} Yes Random UUID A v4 style guid 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

**Body Parameters:** 

###### Property 

###### Name 

###### Example Value Required Description 

 intent "PAYMENT_ORDER" Yes purpose 

 openOrderRequestId "16af88ba-793a-48c7-8ee7-9c0***" Yes REQUEST-ID from the Open Order Request id 

 Abhaaddress sample@sbx Yes abhaAddress of the user/patient. 



---

 Procedures { 

 "category": "OPD consultation", 

 "services": [ 

 { 

 "name": "consultation", 

 "serviceId": "Computerized 2", 

 "description": "Albumin 24 hrs Urine", 

 Yes Which contains the different types of procedures. 

 Only share the selected open order. 

 Category should be: OPD consultation, 

 Laboratory and Diagnostics, 

 Pharmacy, 

 "amount": 629.00 

 } 

 ] 

 }, 

 Miscellaneous/Other 

 Payment Bundle { 

 "paymentMode": "GATEWAY", 

 "paymentUrl": "string", 

 "orderNumber": "123456", 

 "amount": 1250.00, 

 "merchantId": "123465", 

 "description": "Testing" 

 } 

 Yes Which the payment details. 

 response { 

 "requestId": "ec2cfd04-223a-4c00-854f*****" 

 } 

 Yes Random guid. 

###### Request Body 

###### Request Body: 



---

{ 

 "intent": "PAYMENT_ORDER", 

 "openOrderRequestId": "9392*****-325d-42c3-*****-12cdbf473aac", 

 "abhaAddress": sample@sbx ", 

 "procedures": [ 

 { //category : OPD consultation,Laboratory and Diagnostics,Pharmacy,Miscellaneous/Other 

 "category": "OPD consultation", 

 "services": [ 

 { 

 "serviceId": "Flowcytometric 1", 

 "name": "consultation", 

 "description": "string", 

 "amount": 629.00 



---

 } 

 ] 

}, 

{ 

 "category": "Laboratory and Diagnostics", 

 "services": [ 

 { 

 "serviceId": "Diagnostics 1", 

 "name": "Diagnostics", 

 "description": "string", 

 "amount": 629.00 

 } 

 ] 

}, 

{ 

 "category": "Pharmacy", 

 "services": [ 

 { 

 "serviceId": "Pharmacy 1", 

 "name": "Pharmacy", 

 "description": "string", 

 "amount": 629.00 

 } 

 ] 

}, 

{ 

 "category": "Miscellaneous/Other", 

 "services": [ 

 { 

 "serviceId": "Other 1", 

 "name": "Miscellaneous", 

 "description": "string", 

 "amount": 629.00 

 } 

 ] 



---

 } 

 ], 

 "paymentBundle": { 

 "paymentMode": "GATEWAY", 

 "paymentUrl": "string", 

 "orderNumber": "123456", 

 "amount": 1250.00, 

 "merchantId": "123465", 

 "description": "Testing" 

 }, 

 "response": { 

 "requestId": "ec2cfd04-223a-***-854f-76c6dd93d10d" 

 } 

 } 

##### Request Body : Error scenario 

###### Request Body 

 In case of any error or FAIL then only send error object "error": { "code": “1000”, "message": "string" }, "response": { "requestId": "93926800-325d-***-a0ae-12cdbf473aac" } 

###### Response 

###### Response: 

 Code: 202 Accepted 

#### 4.2.8 PATIENT_ON_SELECTION – callback 

###### This is callback api for the on-select API. This Api needs to implement by HIU to received all the select 

###### open order payment requests. 

###### URL: {callback_url}/v3/patient/on-selection 

###### Method : POST 



---

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 CJwaHJNb2JpbGUiOm51bGwsImV4c 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 request-id {{guid}} Yes Random UUID A v4 style guid 

 timestamp {{$isoTimestamp}} Yes ISO TIMESTAMP 

 x-hiu-id Hiu_id Yes Identifier of the health information user to which the request was intended 

**Body Parameters:** 

###### Property 

###### Name 

###### Example Value Required Description 

 intent "PAYMENT_ORDER" Yes purpose 

 openOrderRequestId "16af88ba-793a-48c7-8ee7-9******" Yes REQUEST-ID from the share open order api. 

 AbhaAddress sample@sbx Yes abhaAddress of the user/patient. 



---

 Procedures { 

 "category": "OPD consultation", 

 "services": [ 

 { 

 "name": "consultation", 

 "serviceId": "Computerized 2", 

 "description": "Albumin 24 hrs Urine", 

 Yes Which contains the different types of procedures. 

 Category should be: OPD consultation, 

 Laboratory and Diagnostics, 

 Pharmacy, 

 Miscellaneous/Other 

 "amount": 629.00 

 } 

 ] 

 }, 

 Payment Bundle { 

 "paymentMode": "GATEWAY", 

 "paymentUrl": "string", 

 "orderNumber": "123456", 

 "amount": 1250.00, 

 "merchantId": "123465", 

 "description": "Testing" 

 } 

 Yes Which the payment details. 

 Response { 

 "requestId": "d72b4cd8-39fc-4872896b6cdd8d59658c" 

 } 

 Yes Random guid 

###### Request Body 

###### Request Body: 



---

{ 

 "intent": "PAYMENT_ORDER", 

 "openOrderRequestId": "e17444d4-f148-499d-bbfc-b7ee37cf6c96", 

 "abhaAddress": " sample@sbx ", 

 "procedures": [ 

 { //category : OPD consultation,Laboratory and Diagnostics,Pharmacy,Miscellaneous/Other 

 "category": "OPD consultation", 

 "services": [ 

 { 

 "serviceId": "Flowcytometric 1", 

 "name": "consultation", 

 "description": "string", 



---

 "amount": 629.00 

 } 

 ] 

}, 

{ 

 "category": "Laboratory and Diagnostics", 

 "services": [ 

 { 

 "serviceId": "Diagnostics 1", 

 "name": "Diagnostics", 

 "description": "string", 

 "amount": 629.00 

 } 

 ] 

}, 

{ 

 "category": "Pharmacy", 

 "services": [ 

 { 

 "serviceId": "Pharmacy 1", 

 "name": "Pharmacy", 

 "description": "string", 

 "amount": 629.00 

 } 

 ] 

}, 

{ 

 "category": "Miscellaneous/Other", 

 "services": [ 

 { 

 "serviceId": "Other 1", 

 "name": "Miscellaneous", 

 "description": "string", 

 "amount": 629.00 

 } 



---

 ] 

 } 

 ], 

 "paymentBundle": { 

 "paymentMode": "GATEWAY", 

 "paymentUrl": "http://.... ", 

 "orderNumber": "123456", 

 "amount": 1250.00, 

 "merchantId": "string", 

 "description": "" 

 }, 

 "response": { 

 "requestId": "d72b4cd8-39fc-***-896b-6cdd8d59658c" 

 } 

 } 

###### Response 

###### Response: 

 Code: 200 OK 

#### 4.2.9 PATIENT_SHARE_NOFITY 

###### This is an API called by HIP to send the payment status to HIU. 

###### URL: /api/hiecm/scan-gateway/v3/patient/scan-pay/notify 



---

###### Method: POST 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID Sbx Yes Suffix of the consent manager to which the request was intended 

 REQUEST-ID {{guid}} Yes Random UUID A v4 style guid 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

 X-HIP-ID HIP_ID Yes Identifier of the health information provider to which the request was intended 

###### Body Parameters: 

###### Property 

###### Name 

###### Example Value Required Description 

 acknowledgement { 

 "status": "PENDING", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-***42c3a0ae-12cdbf473aac", 

 "paymentDate": " {{$isoTIMESTAMP}} ", 

 "paymentReceiptLink": "https://.. " 

 }, 

 Yes It contains all details of payment and status ( SUCCESS, CANCELED, PENDING, FAIL, REFUND_INITIATED, REFUND_SUCCESS ) 

 openOrderRequestId: from the share open order api. 

 paymentReceiptLink: Need to send payment receipt link. 



---

###### Request Body 

###### Request Body: 

 { 

 "acknowledgement": { 

 "status": "PENDING", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-325d-42c3-*** -12cdbf473aac", 

 "paymentDate": " {{$isoTIMESTAMP}} ", 

 "paymentReceiptLink": "https://.. " 

 } 

 } 

###### Response 

###### Response: 

 Code: 202 Accepted 

#### 4.2.10 PATIENT_SHARE_NOTIFY – call back 

###### This is callback API for the notify API. This API needs to implement by HIU to received the payment 

###### status. 

###### URL: {callback_url}/v3/patient/scan-pay/notify 

###### Method: POST 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 



---

 authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 CJwaHJNb2JpbGUiOm51bGwsImV4c 

 CI6MTY2NzI5ODExNSwia 

 WF0IjoxNjY3MjkwOTE1LCJwaHJBZ 

 GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX 

 NhdmFuQHNieCIsInR4bklkIjoi 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 request-id {{guid}} Yes Random UUID A v4 style guid 

 timestamp {{$isoTimestamp}} Yes ISO TIMESTAMP 

 x-hiu-id Hiu_id Yes Identifier of the health information user to which the request was intended 

###### Body Parameters: 

###### Property 

###### Name 

###### Example Value Required Description 

 acknowledgement { 

 "status": "PENDING", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-325d42c3*** -12cdbf473aac", 

 "paymentDate": " {{$isoTIMESTAMP}} ", 

 "paymentReceiptLink": "https://.." 

 }, 

 Yes It contains all details of payment and status(SUCCESS, CANCELED, PENDING, FAIL, REFUND_INITIATED, REFUND_SUCCESS ) 



---

###### Request Body: 

###### Request Body: 

 { 

 "acknowledgement": { 

 "status": "PENDING", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-325d-42c3-*** -12cdbf473aac", 

 "paymentDate": " {{$isoTIMESTAMP}} ", 

 "paymentReceiptLink": "https://.." 

 } 

 } 

###### Response 

###### Response: 

 Code: 200 OK 



---

#### 4.2.11 PATIENT_SHARE_ON_NOTIFY 

###### This is an API is called by HIU to notify to HIP so that confirm that the HIU received the payment 

###### status. 

###### URL: /api/hiecm/scan-gateway/v3/patient/scan-pay/on-notify 

###### Method: POST 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID Sbx Yes Suffix of the consent manager to which the request was intended 

 REQUEST-ID {{guid}} Yes Random UUID A v4 style guid 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

###### Body Parameters: 

###### Property 

###### Name 

###### Example Value Required Description 

 acknowledgement { 

 "status": "PENDING", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-325d42c3**** -12cdbf473aac", 

 "paymentDate": " {{$isoTIMESTAMP}} ", 

 "paymentReceiptLink": "https://... " 

 Yes It contains all details of payment and status(SUCCESS, CANCELED, PENDING, FAIL, REFUND_INITIATED, REFUND_SUCCESS). 

 openOrderRequestId from the share open order api. 



---

 } 

 response { 

 "requestId": "16af88ba-793a-48c78ee79********" 

 } 

 Yes requestId from the header of scan-pay notify api. 

###### Request Body 

###### Request Body: 

 { 

 "acknowledgement": { 

 "status": "PENDING", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-325d-42c3-*** -12cdbf473aac", 

 "paymentDate": " {{$isoTIMESTAMP}} ", 

 "paymentReceiptLink": "https://.... 

 }, 

 "response": { 

 "requestId": "bd391f9c-97c6-44bd-bc3a-b7********" 

 } 

 } 

##### Request Body : Error scenario 

###### Request Body 



---

 In case of any error or FAIL then only send error object "error": { "code": “1000”, "message": "string" }, "response": { "requestId": "93926800-325d-42c3-a0ae-12cdbf473aac" } 

###### Response 

###### Response: 

 Code: 202 Accepted 

#### 4.2.12 PATIENT_SHARE_ON_NOTIFY – callback 

###### This is an callback API for on-notify API need to implement by HIP to received the confirmation of 

###### notification. 

###### URL: {callback_url}/v3/patient/scan-pay/on-notify 

###### Method: POST 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 x-hip-id HIP_ID Yes Identifier of the health information provider to which the request was intended 

 authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 request-id {{guid}} Yes Random UUID A v4 style guid 



---

 timestamp {{$isoTimestamp}} Yes ISO TIMESTAMP 

###### Body Parameters: 

###### Property 

###### Name 

###### Example Value Required Description 

 acknowledgement { 

 "status": "PENDING", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-325d42c3a0ae-***", 

 "paymentDate": "123456", 

 "paymentReceiptLink": "https://webhook.site/d872d6ba-45e1-45b48fb92ee4b5a017b5" 

 }, 

 Yes It contains all details of payment and status(SUCCESS, CANCELED, PENDING, FAIL, REFUND_INITIATED, REFUND_SUCCESS) 

 response { 

 "requestId": "16af88ba-793a-48c7-8ee7-9c****" 

 } 

 Yes REQUEST-ID from the /share/open-order api. 

###### Request Body 

###### Request Body: 



---

 { 

 "acknowledgement": { 

 "status": "PENDING", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-325d-**c3-a0ae-12cdbf473aac", 

 "paymentDate": "123456", 

 "paymentReceiptLink": "https://.. " 

 }, 

 "response": { 

 "requestId": "a6fbbb6f-a952-4e2b-8bfc-3f165f0e524f" 

 } 

 } 

###### Response 

###### Response: 

 Code: 200 OK 

#### 4.2.13 PATIENT_SHARE_ORDER_STATUS 

###### This is an API is called by HIU to check the status of reports. 

###### URL: /api/hiecm/scan-gateway/v3/patient/scan-pay/order-status 



---

###### Method: POST 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 X-CM-ID Sbx Yes Suffix of the consent manager to which the request was intended 

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 REQUEST-ID {{guid}} Yes Random UUID A v4 style guid 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

 X-AUTH-TOKEN User Login Token yes JWT Access token which was issued by PHR service after successfully user authentication. If HIP does not have any role, then it is mandatory. 

 X-HIU-ID HIU_ID yes Identifier of the health information user to which the request was intended 

###### Body Parameters: 

###### Property 

###### Name 

###### Example Value Required Description 

 queryStatus { 

 "orderNumber": "123456", 

 "abhaAddress": " sample@sbx ", 

 "openOrderRequestId": "93926800325d42c3-a0ae-12cd*****" 

 } 

 Yes It contains the orderNumber should be same entire flow and openOrderRequestId from the /share/open-order api. 



---

###### Request Body 

###### Request Body: 

 { 

 "queryStatus": { 

 "orderNumber": "123456", 

 "abhaAddress": " sample@sbx ", 

 "openOrderRequestId": "93926800-325d-42c3-a0ae-12c****" 

 } 

 } 

###### Response 

###### Response: 

 Code: 202 Accepted 

#### 4.2.14 PATIENT_SHARE_ORDER_STATUS – callback 

###### This is callback API for the order_status API. This Api needs to implement by HIP to receive the request 

###### for payment status. 

###### URL : {callback_url}/v3/patient/scan-pay/order-status 

###### Method: POST 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 x-hip-id HIP_ID Yes Identifier of the health information provider to which the request was intended 

 authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 CJwaHJNb2JpbGUiOm51bGwsImV4c 

 CI6MTY2NzI5ODExNSwia 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 



---

 request-id {{guid}} Yes Random UUID A v4 style guid 

 timestamp {{$isoTimestamp}} Yes ISO TIMESTAMP 

###### Body Parameters: 

###### Property 

###### Name 

###### Example Value Required Description 

 queryStatus { 

 "orderNumber": "123456", 

 "abhaAddress": " sample@sbx ", 

 "openOrderRequestId": "93926800-325d-**a0ae12cdbf473aac" 

 } 

 Yes It contains the orderNumber , abhaAddress and openOrderRequestId. 

 REQUEST-ID : share/openorder REQUESTID 

###### Request Body 

###### Request Body: 

 { 

 "queryStatus": { 

 "orderNumber": "123456", 

 "abhaAddress": sample@sbx ", 

 "openOrderRequestId": "93926800-325d-****-a0ae-12cdbf473aac" 

 } 

 } 

###### Response 

###### Response: 

 Code: 200 OK 



---

#### 4.2.15 PATIENT_SHARE_ON_ORDER_STATUS 

###### This is an API is called by HIP to send the payment status to HIU. 

###### URL: /api/hiecm/scan-gateway/v3/patient/scan-pay/on-order-status 

###### Method: POST 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID Sbx Yes Suffix of the consent manager to which the request was intended 

 REQUEST-ID {{guid}} Yes Random UUID A v4 style guid 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

###### Body Parameters: 

###### Property 

###### Name 

###### Example Value Required Description 



---

 acknowledgement { 

 "status": "SUCCESS", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-325d42c3a0ae-12cdbf473aac", 

 "paymentDate": " {{$isoTIMESTAMP}} ", 

 "paymentReceiptLink": "https://..” 

 } 

 Yes It contains all details of payment and status(SUCCESS, CANCELED, PENDING, FAIL, REFUND_INITIATED, REFUND_SUCCESS 

 REQUEST-ID : share/openorder REQUESTID 

 paymentDate : final payment status date 

 paymentRecipetURL : pdf link for payment recipet 

 response { 

 "requestId": "16af88ba-793a-48c78ee79c0*******" 

 }, 

 Yes requestId from the 

 Order-status requestId. 

###### Request Body 

###### Request Body: 



---

 { 

 "acknowledgement": { 

 "status": "SUCCESS", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "93926800-325d-42c3-a0ae-12cdbf473aac", 

 "paymentDate": " {{$isoTIMESTAMP}} ", 

 "paymentReceiptLink": "https://..” 

 }, 

 "response": { 

 "requestId": "16af88ba-793a-48c7-8ee7-9c********" 

 } 

 } 

##### Request Body : Error scenario 

###### Request Body 

 In case of any error or FAIL then only send error object "error": { "code": “1000”, "message": "string" }, "response": { "requestId": "93926800-325d-***-a0ae-12cdbf473aac" } 

###### Response 

###### Response: 

 Code: 202 Accepted 

#### 4.2.16 PATIENT_SHARE_ON_ORDER_STATUS – callback 

###### This is callback for the on-order-status API. This API needs to implement by HIU for receive the 

###### payment status. 

###### URL: {callback_url}/v3/patient/scan-pay/on-order-status 



---

###### Method: POST 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 CJwaHJNb2JpbGUiOm51bGwsImV4c 

 CI6MTY2NzI5ODExNSwia 

 WF0IjoxNjY3MjkwOTE1LCJwaHJBZ 

 GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX 

 NhdmFuQHNieCIsInR4bklkIjoi 

 YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 request-id {{guid}} Yes REQUEST-ID from the /share/open-order api. 

 timestamp {{$isoTimestamp}} Yes ISO TIMESTAMP 

 x-hiu-id Hiu_id Yes Identifier of the health information user to which the request was intended 

###### Body Parameters: 

###### Property 

###### Name 

###### Example Value Required Description 

 acknowledgement { 

 "status": "SUCCESS", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", 

 "orderNumber": "123456", 

 "openOrderRequestId": "e17444d4-** -499dbbfcb7ee37cf6c96", 

 "paymentDate": "2025-01-20T09:54:51.114Z", 

 Yes It contains all details of payment and status(SUCCESS, CANCELED, PENDING, FAIL, REFUND_INITIATED, REFUND_SUCCESS). 



---

 "paymentReceiptLink": https://.. 

 } 

 response { 

 "requestId": "16af88ba-793a-48c78ee79c*******" 

 }, 

 Yes requestId from the order_status api. 

###### Request Body 

###### Request Body: 

 { 

 "acknowledgement": { 

 "status": "SUCCESS", 

 "abhaAddress": " sample@sbx ", 

 "transactionId": "123456", s 

 "orderNumber": "123456", 

 "openOrderRequestId": "e17444d4-f148-***-bbfc-b7ee37cf6c96", 

 "paymentDate": "2025-01-20T09:54:51.114Z", 

 "paymentReceiptLink": "https://..... " 

 }, 

 "response": { 

 "requestId": "fb7ecfab9778 **-ba8e-68c34ba94a9b" 

 } 

 } 

###### Response 

###### Response: 

 Code: 200 OK 



---

#### 4.2.17 Get all details 

###### This API is used to get all the details of the user based on date ranges. 

###### Url: /api/hiecm/scan-gateway/v3/patient/scan-pay/details 

###### Method: GET 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 CJwaHJNb2JpbGUiOm51bGwsImV4c 

 CI6MTY2NzI5ODExNSwia 

 WF0IjoxNjY3MjkwOTE1LCJwaHJBZ 

 GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX 

 NhdmFuQHNieCIsInR4bklkIjoi 

 YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 REQUEST-ID {{guid}} Yes REQUEST-ID from the /share/open-order api. 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 



---

 X-AUTH -TOKEN Bearer eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJna XJpamFAc2J4IiwiY2xpZW50SWQiOiJQS 

 FItV0VCIiwicmVxdWVzdGVySWQiOiJrX 2hpcCIsInN5c3RlbSI6IkFCRE0iLCJtb2Jp bGUiOiI4MjgxMTQ3MDgwIiwiZXhwIjoxNj c3NjY5NDU1LCJpYXQiOjE2Nzc2NjIyNT WcFeWA 

 Yes JWT Access token which was issued by PHR service after successfully user authentication. If HIP does not have any role, then it is mandatory. 

 Status SUCCESS Yes Status values: 

- SUCCESS 

- CANCELED 

- PENDING 

- FAIL 

- REFUND_INITIATED 

- REFUND_SUCCESS 

- ALL 

 Limit 10 Yes It describes the no. of records. 

 startDate 2024-07-13T07:30:10.186Z Yes Start date of the record 

 endDate 2025-02-18T08:30:50.189Z Yes End date of the record. 

 Offset 0 No When the offset is 0, it means the retrieval of records starts from the very first record in the dataset. 

###### Response Body 

###### Response Body: 



---

[ 

 { 

 "openOrderRequestId": "65bf92ea-dec0-**-b2e8-c0269556806a", 

 "clientId": "***_000135", 

 "hipId": "***_HIP", 

 "hipName": "*****", 

 "hiuId": "**_HIU", 

 "counterId": "2", 



---

"abhaAddress": "sample@sbx", 

"status": "REQUESTED_OPEN_PAYMENT", 

"paymentStatus": "UN_PAID", 

"paymentAmount": 0.0, 

"dateCreated": "2025-02-14T11:57:34.316Z", 

"dateModified": "2025-02-14T11:57:34.316Z" 

"orderDesc": { 

 "procedures": [ 

 { 

 "category": "OPD consultation", 

 "services": [ 

 { 

 "name": "consultation", 

 "description": "string", 

 "amount": 629.0 

 } 

 ] 

 }, 

 { 

 "category": "Laboratory and Diagnostics", 

 "services": [ 

 { 

 "name": "Diagnostics", 

 "serviceId": "service-12346", 

 "description": "string", 

 "amount": 629.0 

 } 

 ] 

 }, 

 { 

 "category": "Pharmacy", 

 "services": [ 

 { 

 "name": "Pharmacy", 

 "serviceId": "service-12346", 



---

 "description": "string", 

 "amount": 629.0 

 } 

 ] 

 }, 

 { 

 "category": "Miscellaneous/Other", 

 "services": [ 

 { 

 "name": "Miscellaneous", 

 "serviceId": "service-12346", 

 "description": "string", 

 "amount": 629.0 

 } ] } ] } } ] 

#### 4.2.18 Update Scan and pay version 

###### This api is used to update the version to the serviceId. 

###### URL: /api/hiecm/gateway/v3/scanPay/updateVersion 

###### Method: PATCH 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 



---

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 CJwaHJNb2JpbGUiOm51bGwsImV4c 

 CI6MTY2NzI5ODExNSwia 

 WF0IjoxNjY3MjkwOTE1LCJwaHJBZ 

 GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX 

 NhdmFuQHNieCIsInR4bklkIjoi 

 YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 REQUEST-ID {{guid}} Yes Random Unique Id 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

###### Body Parameters: 

###### Property 

###### Name 

###### Example Value Required Description 

 recordShareEnabled True Yes It describes whether the record share is enabled or not 

 scanPayEnabled True Yes It describes whether the scan pay is enabled or not 

 scanPayVersion v3 Yes It contains the version of the service Id 

- v3 

- v2 

 serviceId [ "****_HIP", "***_HIU"] Yes List of service-id’s 



---

###### Request Body 

###### Request Body: 

 { 

 "recordShareEnabled": true , 

 "scanPayEnabled": true , 

 "scanPayVersion": "V2", // For Phase 1 = V2 and Phase 2 = V3 

 "serviceId": [ 

 "hipid_1", 

 "hipid_2", 

 "hipid_3", 

 "hipid_4" 

 ] 

 } 

###### Response 

###### Response: 200 OK 

 Update successful 

#### 4.2.19 Get all provider details 

###### This API is used to retrieve the provider details 

###### URL: /api/hiecm/gateway/v3/providers/{provider-id} 

###### Method: PATCH 

###### Request Headers: 

###### Property 

###### Name 

###### Example Value Required Description 



---

 Authorization Bearer eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 

 YW5Ac2J4IiwiY2xpZW50SWQiOiJz 

 YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy 

 ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL 

 CJwaHJNb2JpbGUiOm51bGwsImV4c 

 CI6MTY2NzI5ODExNSwia 

 WF0IjoxNjY3MjkwOTE1LCJwaHJBZ 

 GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX 

 NhdmFuQHNieCIsInR4bklkIjoi 

 YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 REQUEST-ID {{guid}} Yes Random Unique Id 

 TIMESTAMP {{$isoTimestamp}} Yes ISO TIMESTAMP 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

###### provider-id IN2810014366^ Yes^ Unique identifier of the 

 healthcare provider (HIP/HIU ID) 

###### Response 

###### Response: 200 OK 

 { "identifier": { "name": "MANISH Bihar HIMS ABDM", "id": "MANISH_HIP" }, "facilityType": [ "HIP", "HIU" ], "isHIP": true, "isPaymentShare": true, "isRecordShare": false, "scanPayVersion": "V3" } 



---

## 5 Error code listing 

###### Code Description Explanation 

 ABDM-2401 The X Auth token is invalid. ABDM-2429 Too many attempts Usually in case of replay attacks, where the same REQUESTID+TIMESTAMP have been repeated. ABDM-2500 Unknown Error Server-side error that was unexpected, Bad Request. ABDM-2503 Service down One or more internal service is down. ABDM-2504 External resource unavailable Database or other network resource is not available. ABDM-2501 Payment status Payment status should be SUCCESS, CANCELED, PENDING, FAIL, REFUND_INITIATED, REFUND_SUCCESS 2500 No mapping found for X-HIU-ID ABDM-2500 The Response Request ID does not exist. ABDM-2406 Invalid API sequence flow, please follow logical flow ABDM-2502 The Order Number does not match the Open Order Request ID. ABDM-2500 The Payment Receipt Link is invalid. ABDM-2407 The status is invalid. Please follow the logical status flow or transition ABDM-2500 The ABHA Number is invalid. It must be a 14-digit number. ABDM-2500 The ABHA Address provided is invalid. ABDM-2500 The Counter ID is invalid. It should only contain alphanumeric characters, with a dot (.) or hyphen (-) in the middle. ABDM-2500 The Patient Name is invalid. ABDM-2500 The Patient Gender is invalid. ABDM-2500 The Patient Year of Birth is invalid. ABDM-2500 The Intent Type provided is invalid. 

 ABDM-2500 The HIP ID is invalid. ABDM-2500 The Open Order Request ID is invalid. ABDM-2500 The Response Request ID does not exist. ABDM-2500 The Payment Receipt Link is invalid. ABDM-2500 The Payment Status is invalid. ABDM-2500 The Order Number is invalid. ABDM-2500 Unknown error occurred ABDM-2502 The ABHA address does not match the Open Order Request ID. 



---

ABDM-2502 The Order Number does not match the Open Order Request ID. 

ABDM-2500 The Open Order Request ID does not match the Response Request ID. 

ABDM-2405 The procedure list is invalid. 

ABDM-2405 The Service Amount must be greater than 0 in the specified category: OPD consultation 

ABDM-2405 The Category cannot be null or blank. 

ABDM-2405 The Services cannot be null or empty for the specified category: OPD consultation 

ABDM-2405 The Service Name cannot be null or blank in the specified category: OPD consultation 

ABDM-2500 The procedure list is invalid. 

ABDM-2500 The Intent Type provided is invalid.,The ABHA Address provided is invalid.,The Resp Request ID is invalid,The Open Order Request ID is invalid 

ABDM-2502 The Payment Mode is invalid, please pass the available payment mode,The Order Number is invalid.,The Payment URL is invalid.,The amount provided is invalid.,The Merchant ID is invalid. 

ABDM-2502 The Merchant ID is invalid. 

ABDM-2502 The Payment Mode is invalid, please pass the available payment mode 

ABDM-2502 The Payment URL is invalid. 

ABDM-2502 The amount provided is invalid. 

ABDM-2407 The status is invalid. Please follow the logical status flow or transition. 

ABDM-2500 In category 'OPD consultation', service 'consultation' the ‘amount’ is mismatch. Expected: 629.0INR, Actual: 629.99INR 

ABDM-2502 The Order Number does not match the Open Order Request ID. 

ABDM-2502 The ABHA address does not match the Open Order Request ID. 

ABDM-2500 The Open Order Request ID does not exist. 

ABDM-2500 The Recipient ID is invalid. 

ABDM-2500 The Order Status Request does not match the Open Order Request ID. 

ABDM-2500 Access Denied: The user lacks the required role. 



---

## 6 HIMS Error List 

###### Code Description Explanation 

 ABDM-9001 No open order against ABHA. Please ensure that a minimum of one open order 

 No open order against ABHA 

 ABDM-9002 No regisration found at <<hospital name>>. Contact counter support 

 No patient registered against ABHA 

 ABDM-9003 Hospital services temporarily unavailable. Please try again after some time 

 Hospital services down 

 ABDM-9004 Services dirupted, please try again. API level glitch 

 ABDM-9005 Bank server not responding. Please try again later 

 Bank related 

 ABDM-9006 Service details mismatch. Please ensure original service ID from HMIS 

 Service ID mismatch 



