# Running Token Status

> Source: ABDM Sandbox V3 Documentation
> File: Running_Token_Status_Documentation_6a55ffc7f4.pdf

# Running Token Status 

## Overview 

## The User/Patient can request the HIP for the current ongoing token number in the specific 

## counter and the HIP can respond back with the current ongoing token number along with 

## the average time taken to service a token number, measured in minutes by using the 

## HIECM APIs. 

## Sequence Diagram 



---

## List of APIs 

## Running Token Status 

### This API will be invoked from the integrator application (any PHR application, 

### just like ABHA) to request the HMIS/LIMS for the current running token 

### number in the specific counter. 

### A patient cannot request the current running token number from the HIP if 

### they already don’t have a token number generated for the specified 

### counter. 

### URL: /api/hiecm/patient-share/v3/running-token/status 

### Method: POST 

### Request Headers: 

#### Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end-toend request transaction TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO Date time format represents date and time Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2 F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 



---

 WQtYzNlMTUwOTE3ZGY1In0 X-HIU-ID IN2810014366 Yes Identifier of the health information user to which the request was intended X-CM-ID SBX Yes Suffix of the consent manager to which the request was intended X-AUTH-TOKEN eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJnaXJ pamFAc2J4IiwiY2xpZW50SWQiOiJQSFItV 0VCIiwicmVxdWVzdGVySWQiOiJrX2hpc CIsInN5c3RlbSI6IkFCRE0iLCJtb2JpbGUiOi I4MjgxMTQ3MDgwIiwiZXhwIjoxNjc3NjY5N DU1LCJpYXQiOjE2Nzc2NjIyNTUsInRyYW5z YWN0aW9uSWQiOiJkMmY5OTNkNi1kOD g4LTQyMTMtOTc3My0wYmJjMzMwMjVh NGYiLCJhYmhhQWRkcmVzcyI6Imdpcml qYUBzYngifQ.Ad_jGrduH6_krBBnlRO912 mQabxMOiB0GN6FjdZjoiCQY4AkUD3Mc Gq2NR-X-GAjHVpkRtKx69m4_44hFqTCbZlo09hq0SEM1KBMkPDl163JcFNMJ GnXBa5E-mu6DpBSPAVirSvBVj6CEpZLbTa2nBBSJJi_leszwHNrk dope6rSc2G3SJfCW_DzFmzd_fxdvbFCN1yyhN3Rw5r8A1GnSrVSBhRjm4qy5O_g utl1XW9CaBaZSah7GOxGRr4gpSIJJvILW ovwG58DyNzEhrHtAfIje_pegqRsNMOFIxPYJd2x6CcDKSoAXvXO0jbuoOvlPl5khpl OKU-WcFeWA 

 Yes JWT Access token which was issued by IDP service after successfully user authentication 

### Body Parameters: 

#### Property 

#### Name 

#### Example Value Require 

#### d 

#### Description 

 hipId "TEST_HIP" Yes The identifier of the health information provider context 2 Yes The counter in the HMIS/LIMS for which we request running token 

### Request Body: 



---

#### Request Body: 

##### { 

 "hipId" : "Mohan_HIP", "context": "1" } 

### Response: 

#### Response: 

 Code: 202 ACCEPTED 

## Running Token Status – Callback 

### This is a callback for running token number request API call. This needs to 

### be implemented by HMIS/LIMS at their end. 

### URL: {callback_url}/api/v3/hip/patient/running-token/status 

### Method: POST 

### Request Headers: 

#### Property 

#### Name 

#### Example Value Required Description 

 REQUEST-ID 18235d89-cb13479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end-to-end request transaction 

##### TIMESTAMP 2022-10

##### 06T10:10:00.587Z 

 Yes Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds X-HIP-ID IN2810014366 Yes Identifier of the health information provider to which the request was intended Authorization eyJhbGciOiJSUzUxMi J9. eyJzdWIiOiJ2YXNhbn RoYWt1bWFyLmtlc2F 2 YW5Ac2J4IiwiY2xpZ W50SWQiOiJz 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 



---

 YngiLCJzeXN0ZW0iOi JBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBI Ui1XRUIiL CJwaHJNb2JpbGUiO m51bGwsImV4c CI6MTY2NzI5ODExNS wia WF0IjoxNjY3MjkwOTE1 LCJwaHJBZ GRyZXNzIjoidmFzYW 50aGFrdW1hci5rZX NhdmFuQHNieCIsInR 4bklkIjoi YjEwMGM4ZDMtNTE1Z C00YWFiLTg1O WQtYzNlMTUwOTE3Z GY1In0 

### Body Parameters: 

#### Property 

#### Name 

#### Example Value Require 

#### d 

#### Description 

 hipId "TEST_HIP" Yes The identifier of the health information provider context 2 Yes The counter in the HMIS/LIMS for which we request running token 

### Request Body: 

#### Request Body: 

##### { 

 "hipId" : "Mohan_HIP", "context": "1" } 

### Response: 

#### Response: 

 Code: 202 Accepted 



---

## Running Token On-Status 

### This API will be used by the HIP to respond to the token number request 

### by providing the current ongoing token number at the specified counter. 

### Additionally, the HIP can also share the average time taken to service a token 

### number, measured in minutes. 

### URL: /api/hiecm/patient-share/v3/running-token/on-status 

### Method: POST 

### Request Headers: 

#### Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2 F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 



---

 X-CM-ID SBX Yes Suffix of the consent manager to which the request was intended 

### Body Parameters 

#### Property Name Example Value Required Description 

 hipId TEST_HIP Yes The identifier of the health information provider. 

 context 43 Yes HMIS/LMIS Counter ID runningTokenNumber 3 Yes The ongoing token number in the counter averageTokenServiceTimeInMinutes 5 No The average time taken to service a token number, measured in minutes. Error "error": { 

 "code": "ABDM1234", 

 "message": "Failure reason" 

##### } 

 No This property should be passed if any error occurred while processing with proper error code and message. 

 requestId f29f0e59-83884698-9fe605db67aeac46 

 Yes The request-id from the running token number request API call. 

### Request Body 

#### Request Body: Success 

##### { 

 "token": { "hipId": "Mohan_HIP", "context": "1", "runningTokenNumber": "51", "averageTokenServiceTimeInMinutes": 2 }, "response": { 



---

 "requestId": "86bdcfec-f335-4eb7-ad26-4c69ee608817" } } 

#### Request Body: Error 

##### { 

 "error": { "code": "ABDM-1234", "message": "Failure reason" }, "response": { "requestId": "86bdcfec-f335-4eb7-ad26-4c69ee608817" } } 

### Response 

#### Response: 

 Code : 202 Accepted 

## Running Token On-Status Callback 

### This is a callback for running token number request API call. 

### URL: {callback_url}/api/v3/hiu/running-token/on-status 

### Method: POST 

### Request Headers: 

#### Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end-toend request transaction TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO 8601 represents date and 



---

 time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2 F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID SBX Yes Suffix of the consent manager to which the request was intended X-HIU-ID IN2810014366 Yes Identifier of the health information users to which the request was intended 

### Body Parameters 

#### Property Name Example Value Required Description 

 hipId TEST_HIP Yes The identifier of the health information provider. 

 context 43 Yes HMIS/LMIS Counter ID runningTokenNumber 3 Yes The ongoing token number in the counter averageTokenServiceTimeInMinutes 5 No The average time taken to service a token number, measured in minutes. Error "error": { No This property should be passed if any error occurred 



---

 "code": "ABDM1234", 

 "message": "Failure reason" 

##### } 

 while processing with proper error code and message. 

 requestId f29f0e59-83884698-9fe605db67aeac46 

 Yes The request-id from the running token number request API call. 

### Request Body 

#### Request Body: Success 

##### { 

 "token": { "hipId": "Mohan_HIP", "context": "1", "runningTokenNumber": "51", "averageTokenServiceTimeInMinutes": 2 }, "response": { "requestId": "86bdcfec-f335-4eb7-ad26-4c69ee608817" } } 

#### Request Body: Error 

##### { 

 "error": { "code": "ABDM-1234", "message": "Failure reason" }, "response": { "requestId": "86bdcfec-f335-4eb7-ad26-4c69ee608817" } } 

### Response: 

#### Response: 

 Code : 202 Accepted 



---

# Error Codes Listing 

**Code** (^) **Message** ABDM-1065 Invalid X Auth token ABDM-1031 No tokens found for the abha address today ABDM-1040 Invalid HIU ID ABDM-1015 Request Timed out 



