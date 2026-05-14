# Scan and Share

> Source: ABDM Sandbox V3 Documentation
> File: Scan_and_share_Document_03_03_25_8c48f696e0.pdf

# SANDBOX DOCUMENTATION 

## (ABDM_SCAN & SHARE) 

## Version 1.0 

## regCreated on 03.03.2025 

1 Base URL and X-CM-ID ............................................................................................................................................ 3 

2 Terminology Definition: .......................................................................................................................................... 3 

3 Gateway .................................................................................................................................................................. 3 

 3.1 Overview ......................................................................................................................................................... 3 3.2 List of APIs ...................................................................................................................................................... 3 

3.2.1 Auth token API ......................................................................................................................................... 3 

3.2.2 OpenID Configuration API ......................................................................................................................... 5 

3.2.3 Keycloak Certificate API ........................................................................................................................... 6 

3.2.4 Update bridge URL API ............................................................................................................................. 9 

3.2.5 Registration of Facility & Software Linkage ............................................................................................ 10 

3.2.6 Find bridge by service id ........................................................................................................................ 12 

3.2.7 Find services by bridge id....................................................................................................................... 14 

4 Scan and Profile Share .......................................................................................................................................... 16 

 4.1 Overview ....................................................................................................................................................... 16 4.2 Sequence Diagram ......................................................................................................................................... 17 

4.3 List of APIs .................................................................................................................................................... 17 

4.3.1 Profile share ........................................................................................................................................... 17 

4.3.2 Profile share – Callback........................................................................................................................... 21 

4.3.3 Profile on-share ...................................................................................................................................... 25 

4.3.4 Profile on share – Callback .................................................................................................................... 27 

 4.4 Scan and Record Share ................................................................................................................................. 29 4.4.1 Overview ................................................................................................................................................. 29 

4.4.2 Sequence Diagram .................................................................................................................................. 30 

4.4.3 Record share .......................................................................................................................................... 30 

4.4.4 Record share Callback .......................................................................................................................... 33 

4.4.5 Record on-share ...................................................................................................................................... 36 

4.4.6 Record on-share – Callback .................................................................................................................... 38 

4.5 Scan and Pay.................................................................................................................................................. 41 

4.5.1 Overview ................................................................................................................................................. 41 



---

4.5.2 Sequence Diagram .................................................................................................................................. 41 

4.5.3 List of APIs............................................................................................................................................... 41 

5 Error Codes Listing ................................................................................................................................................ 53 



---

### 1 Base URL and X-CM-ID 

Environment Base URL X-CM-ID 

Sandbox https://dev.abdm.gov.in Sbx 

Production https://apis.abdm.gov.in Abdm 

### 2 Terminology Definition: 

 Bridge ID: Is client ID which provided by NHA to HIP (Its alphanumerical eg: SBX_00XXXX) Service ID: Is Facility ID which is generated from NHPR application (Its alphanumeric eg: IN02100000XX) 

#### 3 Gateway 

#### 3.1 Overview 

 This is the key ABDM building block that manages ABHA addresses, maintains links to health data for each ABHA address and manages consents provided by the user for sharing of their health data. It also supports exchange of interoperable health data between HIPs and HIUs. The HIE-CM enables exchange of personal health data with consent as per the Health Data Management Policy issued by NHA. 

#### 3.2 List of APIs 

#### 3.2.1 Auth token API 

This API will be invoked to generate auth token. 

**URL:** /api/hiecm/gateway/v3/sessions 

**Request:** POST 

**Header Parameters:** 

 Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for tracking the endtoend request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes The actual time when the request was initiated, ISO Date time format represents the date and time 



---

 X-CM-ID Sbx Yes Suffix of the consent manager to which the request was intended. 

**Body Parameters:** 

 Property Name Example Value Required Description 

 clientId SBX_XXXXXX Yes Client id for authentication 

 clientSecret “XXXXXXXXXXXXX” Yes Client secret for authentication 

 grantType client_credentials Yes Grant type for authentication 

**Request Body:** 

 Request Body 

 { "clientId": "SBX_XXXXX", "clientSecret": "XXXX-XXX-XXXX-XXXX-XXXXXXX", "grantType": "client_credentials" } 

**Response:** 

 Response 

 Code : 202 Accepted 



---

 { 

 "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJBbFJiNVdDbThUbTlFSl9JZk85ejA2ajlvQ3Y1MXBLS 0ZrbkdiX1RCdkswIn0.eyJleHAiOjE3MjMyMjU3MTEsImlhdCI6MTcyMzIyNDUxMSwianRpIjoiMzE3MjVkN2Qt NmM1Mi00OWE0LTk0M2MtZmY2ZjhkNjNhYmRlIiwiaXNzIjoiaHR0cHM6Ly9kZXYubmRobS5nb3YuaW4vYX V0aC9yZWFsbXMvY2VudHJhbC1yZWdpc3RyeSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJjN2NhMjk3Yi0yZTVh LTRkN2UtOGY5YS0xYWU2NDAxYWQ0Y2YiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJTQlhfMDAwMTM1Iiwic2Vzc 2lvbl9zdGF0ZSI6IjhiYjQ4ZGM5LTJmMDUtNDA0OC05MGUxLWRjYjgxNWRmOGU5MyIsImFjciI6IjEiLCJhbGx vd2VkLW9yaWdpbnMiOlsiaHR0cDovL2xvY2FsaG9zdDo5MDA3Il0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6W yJIaWRJbnRlZ3JhdGVkUHJvZ3JhbSIsIkhJVV9QQVlFUiIsImhmciIsImhpdSIsIm9mZmxpbmVfYWNjZXNzIi wiaGVhbHRoSWQiLCJwaHIiLCJPSURDIiwiaGVhbHRoX2xvY2tlciIsImhpcCIsImhwX2lkIl19LCJyZXNvdXJjZV 9hY2Nlc3MiOnsiU0JYXzAwMDEzNSI6eyJyb2xlcyI6WyJ1bWFfcHJvdGVjdGlvbiJdfSwiYWNjb3VudCI6eyJy b2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19f Swic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsImNsaWVudEhvc3QiOiIxMDAuNjUuMTYwLjIxNCI sImNsaWVudElkIjoiU0JYXzAwMDEzNSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicHJlZmVycmVkX3VzZXJ uYW1lIjoic2VydmljZS1hY2NvdW50LXNieF8wMDAxMzUiLCJjbGllbnRBZGRyZXNzIjoiMTAwLjY1LjE2MC4yMTQi fQ.L56AYZYfzFrO_gNedAbSwR9foEO661z2cMGEeOKsz2ZXsIpTb9oLd9fmRiixIS7ToGoW2VzzXC14qrXnwZIqknBZchTRJrmyGk6iRJ NQYR4k12hrn4tbdWh5e9m4NWFAvPtGbBUyKA8gotrne9fn7T0MOC7N_J8TS3JLr2gothJSgc9P3VDKm8c6zpAObQPmwEpH qJH6j2Q07nGsoaBygxovoIeFn6G6zwIa-_mKw_a86L_CYxr8Gxw55PXkh2XwYp_xLIiJ3t7vLM97UFThwSn_TmRF6W1LH145m_6NxY4hQclHi1elK3OP4LvR1SLDwtAQZSCm4Jpihd0uMw", 

 "expiresIn": 1200, 

 "refreshExpiresIn": 1800, 

 "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIyMWU5NzA4OS00ZTcxLTQyNGEtOTAzYS1jOTAyMW M1NmFlNWYifQ.eyJleHAiOjE3MjMyMjYzMTEsImlhdCI6MTcyMzIyNDUxMSwianRpIjoiZGY5ODdmYzQtYzdk Ni00OGNmLTliM2EtNzRmNWVkMTljMmNmIiwiaXNzIjoiaHR0cHM6Ly9kZXYubmRobS5nb3YuaW4vYXV0a C9yZWFsbXMvY2VudHJhbC1yZWdpc3RyeSIsImF1ZCI6Imh0dHBzOi8vZGV2Lm5kaG0uZ292LmluL2F1dGg vcmVhbG1zL2NlbnRyYWwtcmVnaXN0cnkiLCJzdWIiOiJjN2NhMjk3Yi0yZTVhLTRkN2UtOGY5YS0xYWU2ND AxYWQ0Y2YiLCJ0eXAiOiJSZWZyZXNoIiwiYXpwIjoiU0JYXzAwMDEzNSIsInNlc3Npb25fc3RhdGUiOiI4YmI0O GRjOS0yZjA1LTQwNDgtOTBlMS1kY2I4MTVkZjhlOTMiLCJzY29wZSI6Im9wZW5pZCBlbWFpbCBwcm9maWx lIn0._cOnTXMf2bObS1nySL-AjvM5PQxgCHJRm2oO66nrx1M", 

 "tokenType": "bearer" 

 } 

## 3.2.2 OpenID Configuration API 

###### Openid-configuration API, defined within OpenID Connect which provides 

###### configuration information about the Identity Provider (IDP). 

**URL:** /api/hiecm/gateway/v3/.well-known/openid-configuration 

**Request:** GET 

**Header Parameters:** 



---

 Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for tracking the endtoend request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes The actual time when the request was initiated, ISO Date time format represents the date and time 

 X-CM-ID Sbx Yes Suffix of the consent manager to which the request was intended. 

**Response** 

 Response 

 Code : 202 OK 

 { 

 "jwks_uri": "https://dev.abdm.gov.in/api/hiecm/gateway/v3/certs" 

 } 

#### 3.2.3 Keycloak Certificate API 

In response to open ID configuration API, Keycloak, the open-source identity provider, 

provides an OAuth certificate that can be used with open source authentication requests 

for certificates. 

**URL:** /api/hiecm/gateway/v3/certs 

**Request:** GET 

**Header Parameters:** 

 Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for tracking the endtoend request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes The actual time when the request was initiated, ISO Date time format represents the date and time 

 X-CM-ID Sbx Yes Suffix of the consent manager to which the request was intended. 



---

**Response** 

 Response 

 Code : 202 OK 

 { 

 "keys": [ 

 { 

 "e": "AQAB", 

 "kid": "AlRb5WCm8Tm9EJ_IfO9z06j9oCv51pKKFknGb_TBvK0", 

 "kty": "RSA", 

 "n": "mgmW7W5ZGF_G5cJevwYi8HiPcI-6qS_psnZxa4v3bkwAkyOoOd8-6ketrOIZA2PbRbGnxFfZHiI94rdFXJ4Q9ampscsz9NocTIPMPmWydJ8A50pZaYWyikYDSJiDltq7i3WspPKSOuQHrC 5h9dMcCVveX5oeg0tO68Z79gwDlpcxiqDbFaphsqDvx5XkfwiqvOBaybK6_BCBPuTqWMUEuUklLYXu2X7ESHdVNFMFAjxCcCXUtP7LFdvT3nnFekRmG82QbSQSVe 4N5tPH8q0MCxSWWn2c15bDnzOF-dvfRCVPRabCzw0M-utHR9diTrWtq6Koi5buxgwM1rbk0p8Q", 

 "use": "sig", 

 "x5c": [ 

 "MIICrzCCAZcCBgFy/3WZBjANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBjZW50cmFsLXJlZ2lzdHJ5 MB4XDTIwMDYyOTA5NDEzNloXDTMwMDYyOTA5NDMxNlowGzEZMBcGA1UEAwwQY2VudHJhbC1yZWdpc 3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJoJlu1uWRhfxuXCXr8GIvB4j3CPuqkv6b J2cWuL925MAJMjqDnfPupHraziPmQNj20Wxp8RX2R4iPeK3RVyeEPWpqbHLM/TaHEyDzD5lsnSfAOdKWW mFsopGA0iYg5bau4t1rKTykjrkB6wuYfXTHAlb3l+aHoNLTuvGe/YMA5aXMYqg2xWqYbKg78fuV5H8Iqrzg WsmyuvwQgT7k6ljFBLlJJS2F7tl+xEh3VTRTBQI8QnAl1LT+yxXb0955xXpEZhvNkG0kElXuDebTx/KtDAsUllp9 



---

nNeWw58zhfnb30QlT0Wmws8NDPrrR0fXYk61rauiqIuW7sYMDNa25NKfECAwEAATANBgkqhkiG9w0BAQs FAAOCAQEACkC3TijrXIgi4vn+l1uL1nfdK6vOIL5UZ6yCjSOq7zYW6b3Qe8j7NrPb9RJC+pbIERyNbB+t9hsa5 g1L7lkjCNlUuxfJprsJ9LJKlM5g7dYEA6XPCJ7C6AVlarj72vlWXQvwjnQMO2/CM9/Jp5Hnv2Qwjn7NME2OW M0iblc/TD+DEZK5L5mlWMyuBSQo2o/AcOmfG4MoE5Gm/CaOJ47rSrf+lq83e5+dyKh7uLVAa+5WK8Im 5nEs6BLSGyo2KlaV0mW9yCkoRLLbipjH8+rJwkUU6iu7QVjz0peGZzYldya5n35gMWH7Bu4HqFneKNRww D6w8rGNC+uWtgWejDZ3yQ==" 

 ], 

 "x5t": "EaMhYGUIvMkp8tvSM3QoaqaF8xM", 

 "x5t2": "vGer6Pt8AhZn8RlbHhAFksOCcGf3u1UWU7Qq-Doy7ro", 

 "alg": "RS256" 

 }, 

 { 

 "e": "AQAB", 

 "kid": "oc-l6O1yJ7wJKYEeyeUafsz3Aecq7YnCIqbzbIfkJk8", 

 "kty": "RSA", 

"n": "jDOehgMzurNQT0WJCTWN6a34639uIKOLO1LnXZes_kTakWh6iRxmkExLLCD7MJjz9aijTHwIuKAtOCSbFO pwbqSfF6dMBS2c8cv0AU3pE8kSMpGJKDZ9diA-BuUriwr9BUYSUW8SM68QH_HCaz2mmN_Z8ynTQ4kWw_IdjenVpkHYtq00DriG98l6RXF1Ao9Kd16ctoNbthuQYH0RSRIXnt0Qtm4GSAY7abPCNa64mir0auldU72DJHXwDo6g5OGz6E Mm86ZAV_pvh_5YzFpfkUA8TK2LFVAmC3UpIMxv0yMMKFZjkFGA0QKYMkMTC5ruLaE7cec-njA7dJQnQ", 

 "use": "sig", 

 "x5c": [ 

"MIICrzCCAZcCBgGHxvQVmDANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBjZW50cmFsLXJlZ2lzdHJ 5MB4XDTIzMDQyODA4MTk1N1oXDTMzMDQyODA4MjEzN1owGzEZMBcGA1UEAwwQY2VudHJhbC1yZWdpc 3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIwznoYDM7qzUE9FiQk1jemt+Ot/biCjiztS 512XrP5E2pFoeokcZpBMSywg+zCY8/Woo0x8CLigLTgkmxTqcG6knxenTAUtnPHL9AFN6RPJEjKRiSg2fXYg PgblK4sK/QVGElFvPkjOvEB/xwms9ppjf2fMp00OJFsPyHY/np1aZB2LatNA64hvfJekVxdQKPSndenLaDW7Y bkGB9EUkSF57dELZuBkgGO2mzwjWuuJoq9PmrpXVPu9gyR18A6OoOThs+hDJvOmQFf6b4f+WMxaX5FA PEytixVQJgt1KfiDMb9MjDChWY5BRgNECmDJDEwua7i2hO3HnPp4wO3SUJ0CAwEAATANBgkqhkiG9w0B AQsFAAOCAQEABYAcXOSr+WgOxKVmygID9WjB4rDuAVDyU3GmjBvckdWhYJuBX8Vs04hNVNgf904gqy +D5wZIQU985stK3PdogFGN2jVw2kO9G3hG4/7uwYKqciKApT/pSPMeHRltHGp/Mwr6e5poVwgQyrn+Be H373U1Q6eB1QUYnElP+16y7bbvQhfDAS2X9sqdfurB9YIL5xZMPddZaf7pPX8oWOVlB0XH1JEZfsX125qq0Xn K8z/Rd8KI8zTfJw6D2Kzrk1WvQSlM5KnTQmcSk3kwDlW5Dg657dT49Y68mI4azq34q17JgBhTx3IbTuf94QT w7QC5wmFtO+hc6zPVODX8JWu7sQ==" 



---

 ], 

 "x5t": "-HZ-fkkNBhTsPHWrhATwlZflhdU", 

 "x5t2": "tjVDNCTx7Fn0TfM-6uHvbwjWlIxIaFtGxiZZ6uJFxr4", 

 "alg": "RS512" 

 } 

 ] 

 } 

#### 3.2.4 Update bridge URL API 

This API will be called to update the bridge base URL. 

**URL:** /api/hiecm/gateway/v3/bridge/url 

**Request:** PATCH 

**Header Parameters:** 

 Property Name Example Value Required Description 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac 2J4IiwiY2xpZW50SWQiOi JzYngiLCJzeXN0ZW0iOiJ BQkhBLUEiLCJyZXF1ZXN0Z XJJZCI6IlBIUi1XRUIiLCJwa HJNb2JpbGUiOm51bGws 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret. 

 REQUEST-ID 18235d89-cb13-479dad717a57d5f669a8 

 Yes Unique UUID for tracking the end-to-end request transaction 

 TIMESTAMP 2022-1006T10:10:00.587Z 

 Yes The actual time when the request was initiated, ISO Date time format represents the date and time 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended. 



---

**Body Parameters:** 

 Property Name Example Value Required Description 

 url https://webhook.site/b7 99c0b8-4e754545 8eb2d8c2d5f0c9f6 

 Yes Bridge base URL 

**Request Body:** 

 Request Body 

 { "url": "https://webhook.site/b799c0b8-4e75-4545-8eb2-d8c2d5f0c9f6" } 

**Response:** 

 Response 

 Code : 202 Accepted 

#### 3.2.5 Registration of Facility & Software Linkage 

 Overview: The software being used by the provider must integrate with the digital building blocks of ABDM and comply with the guidelines outlined NHA. NHA maintains the national directory of all healthcare facilities. Any participating facility needs to sign up in the health facility registry at (nhpr.abdm.gov.in) This ensures that they are a valid facility which is authorized to issue health records in the ecosystem. HFR consists of information for each healthcare facility in the country – hospitals, clinics, diagnostic centers, pharmacies etc., across all systems of medicine and covering both public and private health facilities. HFR offers APIs that can be used by various stakeholders in the ecosystem. Healthcare information service provider application or healthcare repository provider application must be upgraded to become ABDM compliant. 

**Registration of facility:** 

**Through website** : https://hspsbx.abdm.gov.in/home (sandbox) , 

 https://nhpr.abdm.gov.in/home (production) Step-by-step user manual document access: 

Goto: https://hspsbx.abdm.gov.in/home (sandbox) , https://nhpr.abdm.gov.in/home (production) 

 >>Resource center >> User Manual >> Select “For Health Fecility” >>Download “User Manual” >>Refer Content 



---

 “A” (Health Professional ID (HPID) creation), “B” (Facility Registration) Registration of bridge services (HIP/HIU) on facility: 

**Option 1** : Linking through website: https://hspsbx.abdm.gov.in/home (sandbox) , 

 https://nhpr.abdm.gov.in/home (production) Step-by-step user manual document access: Goto: https://hspsbx.abdm.gov.in/home (sandbox) , https://nhpr.abdm.gov.in/home (production) >>Resource center >> User Manual >> Select “For Health Facility” >>Download “User Manual” >>Refer Content “C” (Software Linkage). 

 Option 2: Through API This API ( https://facilitysbx.abdm.gov.in/v1/bridges/MutipleHRPAddUpdateServi ces ) will be used to link multiple bridges against a facility. It will accept the facility id , facility name and list of HRP i.e. bridges. 

Please note: 

- You must pass in all the required parameters to create the API. 

- The data needs to be passed in the required format as mentioned for each field. **API can refer swagger link :** https://facilitysbx.abdm.gov.in/swaggerui.html#/Multiple_HRP_API >>>Go to Multi HRP 

 API >>>and Select “/v1/bridges/MutipleHRPAddUpdateServices v1MutipleHRPAddUpdateServices” 

**Parameters:** 

 Params Required Description Data type 

**Format if any** 

 facilityId Yes Will be validated if present in HFR or not 

 String Starting with IN and of 12 characters 

**facilityName** Yes Name of the facility to be linked String Alphanumeric 

 bridgeId Yes Valid Bridge Id to be linked. String Alphanumeric and validity to be checked by HIECM 



---

 hipName Yes • To provide uniqueness against each bridges that is linked. HIP name is the 

 String • HIP name can be the Hospital name added 

bridgeName (^) name of the hospital which will reflect with suffix of bridge name. example on ABHA/PHR app when the patent will search for the respective hospital. Hospital name=XYZ and bridge name =BRIDGE TEST, so the HIP name = XYZ BRIDGE. 

- HIP name can not be more than 15 characters., No special 

 character is allowed (%$*#@(~&!), and it should be unique for every 

 bridge for a facility 

 type Yes HIP / HIU etc String Validated by HIECM 

 Active Yes True/false boolean Accept Boolean value 

#### 3.2.6 Find bridge by service id 

This API will fetch the bridge details for the given service id. 

**URL:** /api/hiecm/gateway/v3/bridge-service/serviceId/{serviceId} 

**Request:** GET 



---

**Header Parameters:** 

 Property Name Example Value Required Description 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac 2J4IiwiY2xpZW50SWQiOi JzYngiLCJzeXN0ZW0iOiJ BQkhBLUEiLCJyZXF1ZXN0Z XJJZCI6IlBIUi1XRUIiLCJwa HJNb2JpbGUiOm51bGws ImV4cCI6MTY2NzI5ODEx NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret. 

 REQUEST-ID 18235d89-cb13-479dad717a57d5f669a8 

 Yes Unique UUID for tracking the end-to-end request transaction 

 TIMESTAMP 2022-1006T10:10:00.587Z 

 Yes The actual time when the request was initiated, ISO Date time format represents the date and time 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended. 

**Response:** 

 Response 

 Code : 200 Ok 

 { "id": 1561, "bridgeId": "SBX_XXXX", "serviceId": "TestClinicHIP", "name": "TestClinicHIP", "isHip": true, "isHiu": true, "isPhr": false, "endpoints": {}, "active": true, "registerTime": "2021-03-01 11:17:35.1735", "dateCreated": "2021-03-01 11:17:35.1735", 



---

 "dateModified": "2024-04-22 11:04:46.446" } 

#### 3.2.7 Find services by bridge id 

This API will fetch all the service ID details linked with the respective bridge id. 

**URL:** /api/hiecm/gateway/v3/bridge-services 

**Request:** GET 

**Header Parameters:** 

 Property Name Example Value Required Description Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac 2J4IiwiY2xpZW50SWQiOi JzYngiLCJzeXN0ZW0iOiJ BQkhBLUEiLCJyZXF1ZXN0Z XJJZCI6IlBIUi1XRUIiLCJwa HJNb2JpbGUiOm 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret. 

 REQUEST-ID 18235d89-cb13-479dad717a57d5f669a8 

 Yes Unique UUID for tracking the end-to-end request transaction 

 TIMESTAMP 2022-1006T10:10:00.587Z 

 Yes The actual time when the request was initiated, ISO Date time format represents the date and time 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended. 

**Response:** 

 Response 

 Code : 200 Ok 

 { "bridge": { "id": "SBX_XXXX", "name": "Testing", "url": "https://abdcb.doctor9.com", "active": true, "blocklisted": false }, "services": [ 



---

{ "id": "@#$%^&*(", "name": "hello", "types": [ "HIP", "HIU" ], "endpoints": { "hipEndpoints": [ { "use": "registration", "connectionType": "HTTPS", "address": "https://events.hookdeck.com/e/src_3gsnEgI941mh/registration" 

}, { "use": "data-upload", "connectionType": "HTTPS", "address": "https://events.hookdeck.com/e/src_3gsnEgI941mh/dataupload" } ], "hiuEndpoints": [ { "use": "registration", "connectionType": "HTTPS", "address": "https://events.hookdeck.com/e/src_3gsnEgI941mh/registration" }, { "use": "data-upload", "connectionType": "HTTPS", "address": "https://events.hookdeck.com/e/src_3gsnEgI941mh/dataupload" } ], "healthLockerEndpoints": [ { "use": "registration", "connectionType": "HTTPS", "address": "https://events.hookdeck.com/e/src_3gsnEgI941mh/registration" }, { "use": "data-upload", "connectionType": "HTTPS", "address": "https://events.hookdeck.com/e/src_3gsnEgI941mh/dataupload" } ] }, "active": true } 



---

 ] } 

### 4 Scan and Profile Share 

##### 4.1 Overview 

 The User/Patient can share his/her basic KYC information with the HMIS/LIMS by scanning the QR Code using the integrator application (Example: ABHA App), which enables them to complete the seamless profile share during their visit. The authenticity of the profile information is verified by the HIE-CM internally before sharing with the HMIS/LIMS. 

 The content of the QR code is a URL (sample for reference: https://phrsbx.abdm.gov.in/shareprofile?hipid=IN3410000260&counterid=12345) that contains 2 parameters: 

- The HIP ID 

- Facility defined context (for example: counter code) 



---

#### 4.2 Sequence Diagram 

#### 4.3 List of APIs 

#### 4.3.1 Profile share 

 This API will be invoked from the integrator application (any PHR application, just like ABHA) to share the user/patient profile with HMIS/LIMS. 

 URL: /api/hiecm/patient-share/v3/share Method: POST 

**Request Headers:** 

 Property Name 

Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 



---

TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO Date time format represents date and time 

Authorizatio n 

 eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

X-HIU-ID IN2810014366 Yes Identifier of the health information user to which the request was intended 

X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

X-AUTHTOKEN 

 eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJna XJpamFAc2J4IiwiY2xpZW50SWQiOiJQS FItV0VCIiwicmVxdWVzdGVySWQiOiJrX 2hpcCIsInN5c3RlbSI6IkFCRE0iLCJtb2Jp bGUiOiI4MjgxMTQ3MDgwIiwiZXhwIjoxNj c3NjY5NDU1LCJpYXQiOjE2Nzc2NjIyNTUs InRyYW5zYWN0aW9uSWQiOiJkMmY5O TNkNi1kODg4LTQyMTMtOTc3My0wYmJj MzMwMjVhNGYiLCJhYmhhQWRkcmVzc yI6ImdpcmlqYUBzYngifQ.Ad_jGrduH6 _krBBnlRO912mQabxMOiB0GN6FjdZjoi CQY4AkUD3McGq2NR-XGAjHVpkRtKx69m4_44h

 Yes JWT Access token which was issued by IDP service after successfully user authenticatio n 



---

 FqTCbZlo09hq0SEM1KBMkPDl163JcFNM JGnXBa5E-mu6DpBSPAVirSvBVj6CEpZLbTa2nBBSJJi_leszwHNr kdope6rSc2G3SJfCW_DzFmzd_fxdvbFCN1yyhN3Rw5r8A1GnSrVSBhRjm4qy5O _ gutl1XW9CaBaZSah7GOxGRr4gpSIJJvIL WovwG58DyNzEhrHtAfIje_pegqRsNMO FIxPYJd2x6CcDKSoAXvXO0jbuoOvlPl5kh plOKU-WcFeWA 

**Body Parameters:** 

 Property Name 

Example Value Require d Description 

 intent "PROFILE_SHARE" Yes This is a key value pair which contains the purpose with following possible values. Profile_share Payment Health_record_sharing 

 metaData { "hipId": "Test_HIP", "context": "ABC123", "hprId": "abdulkalam@abdm", "latitude": "38.679", "longitude": "58.498" } 

 Yes This is a key value pair which contains the location longitude and latitude. hipId:healthInformationProviderId context:counterCode hprId:healthprofessionalregisterId 



---

 profile { "patient": { "abhaNumber": 18443810806111, "abhaAddress": "1844381@abdm", "name": "User 1", "gender": "M", "dayOfBirth": "20", "monthOfBirth": "1", "yearOfBirth": "1999", "address": { "line": "C/O Sandipan Kshirsagar Ambejogai Road Renuka Nagar Latur", "district": null , "state": null , "pincode": null , } 

 "phoneNumber": "9876543210" } } 

 Yes This is key value pair which contains patient details 

**Request Body** 

Request Body: 



---

 { "intent": "PROFILE_SHARE", "metaData": { "hipId": "MAYUR_HIP", "context": "ABC123", "hprId": "abdulkalam@abdm", "latitude": "-38.679", "longitude": "58.498" }, "profile": { "patient": { "abhaNumber": 91178386101251, "abhaAddress": "9117838@sbx", "name": "User 1", "gender": "M", "dayOfBirth": "10", "monthOfBirth": "10", "yearOfBirth": "1994", "address": { "line": "C/O Sandipan Kshirsagar Ambejogai Road Renuka Nagar", "district": null , "state": null , "pincode": null }, "phoneNumber": "9876543210" } } } 

**Response** 

Response: 

 Code: 202 ACCEPTED 

#### 4.3.2 Profile share – Callback 

This is a callback API for patient share API. 

**URL:** {callback_url}/api/v3/hip/patient/share 

 Method: Post Request Headers: 

 Property Name 

Example Value Required Description 



---

 REQUEST-ID 18235d89-cb13479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-1006T10:10:00.587Z 

 Yes Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds 

 X-HIP-ID IN2810014366 Yes Identifier of the health information provider to which the request was intended 

**Body parameters** 

Property Name Example Value Required Description 

 intent PROFILE_SHARE Yes This is a key value pair which contains the purpose with following possible values. Profile_share Payment Health_record_sharing 

 metaData "metaData": { "hipId": "MAYUR_HIP", "context": "ABC123", "hprId": "abdulkalam@abdm", "latitude": "-38.679", "longitude": "58.498" } 

 Yes This is a key value pair which contains the location longitude and latitude. hipId:healthInformationProviderId context:counterCode hprId:healthprofessionalregisterId 

 profile "profile": { "patient": { "abhaNumber": 91178386176531, 

 Yes This is key value pair which contains all the patient details 



---

 "abhaAddress": "91178386@sbx", "name": "User 1", "gender": "M", "dayOfBirth": "10", "monthOfBirth": "10", "yearOfBirth": "1994", "address": { "line": "C/O Sandipan Kshirsagar Ambejogai Road", "district": null , "state": null , "pincode": null }, "phoneNumber": "9876543210" } 

**Request Body** 

Request Body: 



---

 { "intent": "PROFILE_SHARE", "metaData": { "hipId": "MAYUR_HIP", "context": "ABC123", "hprId": "abdulkalam@abdm", "latitude": "-38.679", "longitude": "58.498" }, "profile": { "patient": { "abhaNumber": 9117838615XXXX, "abhaAddress": "91178XXXX@sbx", "name": "User 1", "gender": "M", "dayOfBirth": "XX", "monthOfBirth": "XX", "yearOfBirth": "XXXX", "address": { "line": "C/O Sandipan Kshirsagar Ambejogai Road Renuka Nagar", "district": null , "state": null , "pincode": null }, "phoneNumber": "987654XXXX" } } } 

**Response** 

Response: 

 Response: In call back url below details should be displayed as per the Xauth token 

 {"intent":"PROFILE_SHARE","metaData":{"hipId":"MAYUR_HIP","context":"6","hprId":"abdulkal am@hpr.abdm","latitude":"38.670","longitude":"58.498"},"profile":{"patient":{"abhaNumber":"91178386156891","abhaAddr ess":"911783XX@sbx","name":"User 1", "gender":"M","dayOfBirth":"XX","monthOfBirth":"XX","yearOfBirth":"XXXX","address":{"line":null ,"district":null,"state":null,"pincode":null},"phoneNumber":"987654XXXX"}}} 

 Code: 200 OK 



---

#### 4.3.3 Profile on-share 

 This API will be invoked by HIP to acknowledge the request by the user/patient to share the profile details. 

 URL: /api/hiecm/patient-share/v3/on-share Method: Post 

**Request Headers:** 

 Property Name 

Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds 



---

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

**Body Parameters** 

 Property Name 

Example Value Required Description 

 abhaAddress ABHA address Yes Patient ABHA address against which the health records needs to be linked 

 status “SUCCESS” Yes Transaction status from HIP to HIECM, “success” “failed” 

 context 43 Yes HMIS/LMIS Counter ID 

 tokenNumber 3 Yes Token number at HMIS/LMIS to be provided to the patient 

 expiry 180 Yes Patient year of birth 

 requestId f29f0e59-838846989fe605db67aeac46 

 Yes This is a key value pair which contains the purpose 



---

**Request Body** 

Request Body: 

 { "acknowledgement": { "abhaAddress": "abc@abdm", "status": "success", "profile": { "context": "43", "tokenNumber": "3", "expiry": "180" } }, "response": { "requestId": "f29f0e59-8388-4698-9fe6-05db67aeac46" } } 

**Response** 

Response: 

 Code : 200 OK 

**Request Body : ERROR** 

 -> Use this in case of error response (Ex: This is the one example for error payload and the code will be same. But, message will be change each error). 

Request Body: 

 { "error": { "code": "ABDM-9999: ", "message": "string" }, "response": { "requestId": "6f0b4665-a915-4c92-aa36-65afb4a2cd71" } } 

#### 4.3.4 Profile on share – Callback 

This is a callback API for patient on-share API. 

**URL:** {callback_url}/api/v3/hiu/patient/on-share 



---

**Method:** Post 

**Request Headers:** 

 Property Name 

Example Value Required Description 

 REQUEST-ID 18235d89-cb13479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-1006T10:10:00.587Z 

 Yes Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds 

 X-HIU-ID ABDM_sbx Yes Suffix of the HIU to which the request was intended 

**Body Parameters:** 

Property Name Example Value Required Description 

 abhaAddress ABHA address Yes Patient ABHA address against which the health records needs to be linked 

 Status “success” Yes Trasaction status from HIP to HIE-CM, 

 “success” “failed” 

 Context 43 Yes HMIS/LMIS Counter ID 

 tokenNumber 3 Yes Token number at HMIS/LMIS to be provided to the patient 

 Expiry 180 Yes Patient year of birth 

 requestId f29f0e59-838846989fe605db67aeac46 

 Yes This is a key value pair which contains the purpose 

**Request Body** 

Request Body: 



---

 "acknowledgement": { "abhaAddress": "abc@abdm", "status": "success", "context": "43", "tokenNumber": "3", "expiry": 180 }, "response": { "requestId": "f29f0e59-8388-4698-9fe6-05db67aeac46" } } 

**Response** 

Response: 

 Code: 200 OK 

#### 4.4 Scan and Record Share 

#### 4.4.1 Overview 

- The User/Patient can share his/her basic KYC information with the HMIS/LIMS     by scanning the QR Code using the integrator application (Example: ABHA App), which     enables them to complete the seamless profile share during their visit. 

- The authenticity of the profile information is verified by the HIE-CM internally     before sharing with the HMIS/LIMS. 



---

### 4.4.2 Sequence Diagram 

#### 4.4.3 Record share 

 This API will be invoked from the integrator application (any PHR application, just like ABHA) to share the user/patient record with HMIS/LIMS. 

 URL: /api/hiecm/patient-share/v3/share Method: Post Request Headers: 

Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO 8601 represents date and 



---

 time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

 X-Auth-TOKEN eyJhbGciOiJSUzUxMiJ9. _gutl1XW9CaBaZSah7GOxGRr4gpSIJJv ILWovwG58DyNzEhrHtAfIje_pegqRsNM OFIxPYJd2x6CcDKSoAXvXO0jbuoOvlPl5kh plOKUWcFeWA 

 Yes JWT Access token which was issued by IDP service after successfully user authentication 

 X-HIU-ID HIU_ID Yes Identifier of the health information user to which the request was intended 

**Body Parameters** 

 Property Name 

Example Value Required Description 

 Intent RECORD_SHARE Yes This is a key value pair which contains the purpose with following possible values. Profile_share Payment Health_record_sharing 



---

 metadata { "hipId": "Test_HIP", "context": "ABC123", "hprId": "XXXXXX@abdm", "latitude": "-38.679", "longitude": "58.498" } 

 Yes This is a key value pair which contains the location longitude and latitude. hipId:healthInformationProviderId context:counterCode hprId:healthprofessionalregisterId 

 healthInfo Bundle 

 { "content": "eyJhbGciOiJSUzUxMiJ 9-KCAiC5GZd3aPROr 5WtlyQCsz2N0taGCOMNjrd5J TbbayA", "media": "Json", "checkSum": "abcdefg12", 

 "careContextReferenc e": "Blood test" } 

 Yes Patient health record to be shared. 

**Request Body** 

Request Body 

quest Body: 



---

**Response** 

Response: 

 Code : 202 Accepted 

#### 4.4.4 Record share Callback 

This is a callback API for patient share API. 

 { "intent" : "RECORD_SHARE" , "metaData" :{ "hipId" : "HIP_ID" , "context" : "ABC123" , "hprId" : "abdulkalam@abdm" , "latitude" : "-37.519 ", "longitude" : "58.498" }, "profile": { "patient": { "abhaNumber": 9117838615XXXX, "abhaAddress": "91178XXX@sbx", "name": "User 1", "gender": "M", "dayOfBirth": "XX", "monthOfBirth": "XX", "yearOfBirth": "XXXX", "address": { "line": "C/O Sandipan Kshirsagar Ambejogai Road Renuka Nagar", "district": null , "state": null , "pincode": null } , "phoneNumber": "987654XXXX" } }, "healthInfoBundle" :{ "content" : “eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiIxODQ0MzgxMDgwNjQ0MEBh0EtAAibtzTS2yF Bq0_6fbIymHjv4_IpIcyU9aSFEC2VYgHxuoGEFC5FEje8 FAua8 FMrWAsTwioxbGujqjvcM9OC1BUrRakmAVxk7GGfmF7jQC8wBxH KCAiC5GZd3aPROr 5 WtlyQ Csz2N0taGCOMNjrd5JTbbayA”, 

 "media" : "Json" , "checkSum" : "abcdefg12" , "careContextReference" : "Blood test" } } 



---

**URL:** {callback_url}/api/v3/hip/patient/share 

**Method:** Post 

**Request Headers:** 

Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2 CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

 X-HIP-ID HIU_ID Yes Identifier of the health information provider to which the request was intended 

**Body Parameters** 

 Proper ty Name 

Example Value Required Description 



---

 Intent RECORD_SHARE Yes This is a key value pair which contains the purpose with following possible values. Profile_share Payment Health_record_sharing 

 metada ta 

 { "hipId": "Test_HIP", "counterId": "ABC123", "hprId": "abdulkalam@abdm ", "latitude": "-38.679", "longitude": "58.498" } 

 Yes This is a key value pair which contains the location longitude and latitude 

 healthIn Bundle 

 { "content": "eyJhbGciOiJSUzUxMi J9.eyJzdWIiOiIxODQ0 MzgxMDgwNjQ0MEB hYmRtIiwiY -FAua8 

 5WtlyQCsz2N0taGCOMNjrd 5JTbbayA", "media": "Json", "checkSum": "abcdefg12", 

 "careContextReferen ce": "Blood test" } 

 Yes Consists of the health information that must be shared with the HIP with encrypted care context content 

**Request Body** 

Request Body: 

 { "intent": "RECORD_SHARE", "metaData": { "hipId": "HIP_ID", "counterId": "ABC123", "hprId": "XXXXXXX@abdm", 



---

 "latitude": "-37.519", "longitude": "58.498" }, "healthInfoBundle": { "content": “eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiIxODQ0MzgxMDgwNjQ0MEBhYmRFAua8 FMrWAsTwioxbGujqjvcM9OC1BUrRakmAVxk7GGfmF7jQC8wBxH-KCAiC5GZd3aPROr 5WtlyQCsz2N0taGCOMNjrd5JTbbayA”, "media": "Json", "checkSum": "abcdefg12", "careContextReference": "Blood test" } } 

**Response** 

Response: 

 Code: 202 Accepted 

#### 4.4.5 Record on-share 

This API will be invoked by HIP to acknowledge the request by the integrator application 

(any PHR application, just like ABHA) to share record. 



---

**URL:** /api/hiecm/patient-share/v3/on-share 

**Method:** POST 

**Request Headers:** 

Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO Date time format represents date and time 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

**Body Parameters** 

 Property Name 

Example Value Required Description 

 abhaAddress ABHA address abhaAddress ABHA address 

 Status “success” Status “success” 



---

 healthInformation { 

 "healthInformationReference": "123456" } 

 payment { "paymentReference": "abc" } 

 requestId f29f0e59-838846989fe605db67aeac46 

 Yes This is a key value pair which contains the purpose 

**Request Body** 

Request Body 

 { "acknowledgement": { "status": "SUCCESS", "abhaAddress": "XXXXXX@abdm", "healthInformation": { "healthInformationReference": "123456" } }, "response": { "requestId": "ecf0cb2d-5178-40d3-85fa-14d25f6bdc0d" } 

**Response** 

Response: 

 Code: 202 ACCEPTED 

#### 4.4.6 Record on-share – Callback 

This is a callback API for patient on-share. 

**URL** : {callback_url}/api/v3/hiu/patient/on-share 

**Method:** POST 

**Request Headers:** 



---

 Property Name 

Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds 

 X-HIU-ID ABDM_sbx Yes Suffix of the HIU to which the request was intended 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

**Body parameters** 

Property Name Example Value Required Description 

 abhaAddress ABHA address Yes Patient ABHA address against which the health records needs to be linked 

 Status “success” Yes Trasaction status from HIP to HIE-CM, “success” “failed” 

 healthInformationReference Yes 



---

 requestId f29f0e59-838846989fe605db67aeac46 

 Yes This is a key value pair which contains the purpose 

**Request Body** 

Request Body: 

 { "acknowledgement": { "status": "SUCCESS", "abhaAddress": "XXXXXXXX@abdm", "healthInformation": { "healthInformationReference": "123456" } }, "response": { "requestId": "ecf0cb2d-5178-40d3-85fa-14d25f6bdc0d" } } 

**Response** 

Response: 

 Code: 200 OK 



---

#### 4.5 Scan and Pay 

#### 4.5.1 Overview 

 The User/Patient can share his/her basic KYC information with the HMIS/LIMS by scanning the QR Code using the integrator application (Example: ABHA App), which enables them to complete the seamless profile share during their visit. The authenticity of the profile information is verified by the HIE-CM internally before sharing with the HMIS/LIMS. 

#### 4.5.2 Sequence Diagram 

#### 4.5.3 List of APIs 

#### 4.5.3.1 Payment share 

 This API will be invoked from the integrator application (any PHR application, just like ABHA) to share the user/patient payment details with HMIS/LIMS. 

**URL:** /api/hiecm/patient-share/v3/share 



---

 Method: Post Request Headers: 

Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was 

 initiated, ISO Date time format represents date and time 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-HIU-ID HIU_ID Yes Identifier of the health information user to which the request was intended 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 

 X-AUTH-TOKEN eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJna XJpamFAc2J4IiwiY2xpZW50SWQiOiJQS FItV0VCIiwicmVxdWVzdGVySWQiOiJrX 2hpcCIsInN5c3RlbSI6IkFCRE0iLCJtb2Jp bGUiOiI4MjgxMTQ3MDgwIiwiZXhwIjoxNj c3NjY5NDU1LCJpYXQiOjE2Nzc2NjIyNT WcFeWA 

 Yes JWT Access token which was issued by IDP service after successfully user authentication 

**Body Parameters** 



---

 Property Name 

Example Value Required Description 

 Intent "PAYMENT_SHARE" Yes This is a key value pair which contains the purpose with following possible values. Profile_share Payment Health_record_sharing 

 metadata { "hipId": "Test_HIP", "counterId": "ABC123", "hprId": "abdulkalam@abdm", "latitude": "-38.679", 

 Yes This is a key value pair which contains the location longitude and latitude. hipId:healthInformationProviderId context:counterCode hprId:healthprofessionalregisterId 

 "longitude": "58.498" } 

 paymentBundle { "upiAddress": "upi@gmail.com", "orderNo": "123", "amount": 1100.123, "merchantId": "LGKYL67895#567y", "description": "Testt" 

 } 

 Yes Consists of payment information such as the upi address, payment amount, order details and the merchant information 

**Request Body** 

Request Body: 



---

 { "intent": "payment_share", "metaData": { "hipId": "HIP_ID", "counterId": "ABC123", "hprId": "XXXXX@abdm", "latitude": "-37.519", "longitude": "58.494" }, "profile": { "patient": { "abhaNumber": {{abha-number}}, "abhaAddress": "{{abha-address}}", "name": "User 1", "gender": "M", "dayOfBirth": "XX", "monthOfBirth": "XX", "yearOfBirth": "XXXX", "address": { "line": "C/O Sandipan Kshirsagar Ambejogai Road Renuka Nagar", "district": null, "state": null, "pincode": null }, "phoneNumber": "9876543210" } }, "paymentBundle": { "upiAddress": "upi@gmail.com", "orderNo": "123", "amount": 1100.123, "merchantId": "LGKYL67895#567y", "description": "Testt" } } 

**Response** 

Response: 

 Code: 202 ACCEPTED 

#### 4.5.3.2 Payment share – Callback 

This is a callback API for payment share. 



---

 URL: {callback_url}/api/v3/hip/patient/share Method: POST Request Headers: 

 Property Name 

Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds 

 X-HIP-ID IN2810014366 Yes Identifier of the health information provider to which the request was intended 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O 

 WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

**Body parameters** 

 Property Name Example Value Required Description Intent { “purpose”: “profile_share”, “hip_id”: “ABDM_HIP”, "context”: “43” } 

 Yes This is a key value pair which contains the purpose 



---

 metadata { lat: 20.5937, long: 78.9629 } Yes This is a key value pair which contains the location longitude and latitude. hipId:healthInformationProviderId context:counterCode hprId:healthprofessionalregisterId paymentBundle { "upiAddress": "upi@gmail.com", "orderNo": "123", "amount": 1100.123, "merchantId": "LGKYL67895#567y", "description": "Testt" 

 } 

 Yes Consists of payment information such as the upi address, payment amount, order details and the merchant information 

**Request Body** 

Request Body: 

 { "intent": "payment_share", "metaData": { "hipId": "HIP_ID", "counterId": "ABC123", "hprId": "XXXXXXXX@abdm", "latitude": "-37.519", "longitude": "58.494" }, "profile": { "patient": { "abhaNumber": {{abha-number}} , "abhaAddress": " {{abha-address}} ", "name": "User 1", "gender": "M", "dayOfBirth": "XX", "monthOfBirth": "XX", "yearOfBirth": "XXXX", "address": { "line": "C/O Sandipan Kshirsagar Ambejogai Road XXXXXX", 



---

 "district": null , "state": null , "pincode": null }, "phoneNumber": "987654XXXX" } }, "paymentBundle": { "upiAddress": "upi@gmail.com", "orderNo": "123", "amount": 1100.123, "merchantId": "LGKYL67895#567y", "description": "Testt" } } 

Response 

Response: 

 Code: 200 OK 



---

#### 4.5.3.3 Payment on-share 

This is an API called by HIP as a response to payment share API call. 

**URL:** /api/hiecm/patient-share/v3/on-share 

**Method:** POST 

**Request Headers:** 

Property Name Example Value Required Description 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO Date time format represents date and time 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 X-CM-ID sbx Yes Suffix of the consent manager to which the request was intended 



---

**Body Parameters** 

 Property Name 

Example Value Required Description 

 abhaAddress ABHA address Yes Patient ABHA address against which the health records needs to be linked 

 status “success” Yes Trasaction status from HIP to HIE-CM, “success” “failed” 

 payment { "acknowledgement": { "status": "SUCCESS", "abhaAddress": "XXXXXXXXX@abdm", "payment": { "paymentReference": "1234567" } 

 Yes Success payment status 

 response { "requestId": "37ba8d92ef3c4a2b-9d4ff25c9e50a23b" } 

 Yes Request Id from the Share api 

**Request Body** 

Request Body: 

 { "acknowledgement": { "status": "SUCCESS", "abhaAddress": "XXXXXX@abdm", "payment": { "paymentReference": "abc" } }, "response": { "requestId": "37ba8d92-ef3c-4a2b-9d4f-f25c9e50a23b" } } 



---

**Response** 

Response: 

 Code: 202 ACCEPTED 

#### 4.5.3.4 Payment on-share – Callback 

This is a callback API for patient on-share. 

 URL: {callback_url}/api/v3/hiu/patient/on-share Method: POST Request Headers: 

 Property Name 

Example Value Required Description 

 Authorization eyJhbGciOiJSUzUxMiJ9. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2 YW5Ac2J4IiwiY2xpZW50SWQiOiJz YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL CJwaHJNb2JpbGUiOm51bGwsImV4c CI6MTY2NzI5ODExNSwia WF0IjoxNjY3MjkwOTE1LCJwaHJBZ GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX NhdmFuQHNieCIsInR4bklkIjoi YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O 

 WQtYzNlMTUwOTE3ZGY1In0 

 Yes JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

 REQUEST-ID 18235d89-cb13-479d-ad717a57d5f669a8 

 Yes Unique UUID for track the end to end request transaction 

 TIMESTAMP 2022-10-06T10:10:00.587Z Yes Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds 



---

 X-HIU-ID ABDM_sbx Yes Suffix of the HIU to which the request was intended 

**Body parameters** 

Property Name Example Value Required Description 

 abhaAddress ABHA address Yes Patient ABHA address against which the health records need to be linked 

 Status “success” Yes Trasaction status from HIP to HIE-CM, “success” “failed” 

 Payment { "acknowledgement": { "status": "SUCCESS", "abhaAddress": "XXXXXXX@abdm", "payment": { 

 "paymentReference": "1234567" } 

 Yes Payment status 

 Response { "requestId": "37ba8d92-ef3c-4a2b9d4f-f25c9e50a23b" } 

 Yes Request Id from the share api 

**Request Body** 

Request Body: 



---

 { "acknowledgement": { "status": "SUCCESS", "abhaAddress": "XXXXXXX@abdm", "payment": { "paymentReference": "abc" } }, "response": { "requestId": "37ba8d92-ef3c-4a2b-9d4f-f25c9e50a23b" } } 

**Response** 

Response: 

 Code: 200 OK 



---

### 5 Error Codes Listing 

 Code Error ABDM-1000 Unable to connect the database 

 ABDM-1001 No data found 

 ABDM-1002 Integrity violation 

 ABDM-1003 Email Gateway is unavailable ABDM-1004 SMS Gateway is unavailable 

 ABDM-1005 Invalid receiver 

 ABDM-1006 Bad Request, invalid request Body ABDM-1007 Connection failed due to timeout 

 ABDM-1008 SMS service currently disabled 

 ABDM-1009 Email service currently disabled ABDM-1010 Validation failed 

 ABDM-1011 Gateway database unavailable 

 ABDM-1012 No records found against the ABHA Address ABDM-1013 Invalid ABHA Number 

 ABDM-1014 Invalid Mobile Email ABDM-1015 Invalid Response 

 ABDM-1016 Invalid TimeStamp 

 ABDM-1017 Invalid TransactionId ABDM-1018 Share Profile database unavailable 

 ABDM-1019 Dependent Service Unavailable 

 ABDM-1020 Unknown database ABDM-1021 Lack of required priviledges 

 ABDM-1022 Too many requests 

 ABDM-1023 Invalid User 

 ABDM-1024 Dependent service unavailable ABDM-1025 Invalid ServiceId 

 ABDM-1026 Invalid Link Token 

 ABDM-1027 

 You are blocked. Please try again after 24 hours. 

 ABDM-1028 HIP is unavailable ABDM-1029 Redis server is unavailable 

 ABDM-1030 Invalid request ID 

 ABDM-1031 Invalid request ABDM-1032 Invalid header 

 ABDM-1033 HIU is unavailable 



---

ABDM-1034 Notification service unavailable 

ABDM-1035 Invalid HIP ID 

ABDM-1035 OTP does not matched 

ABDM-1036 Data does not matched 

ABDM-1037 Counter and Care context count mismatch 

ABDM-1038 ABHA address and Link token mismatch 

ABDM-1039 Invalid Consent request id 

ABDM-1040 Invalid HIU ID 

ABDM-1041 Invalid Acknowledgement 

ABDM-1042 Provider Mandatory 

ABDM-1043 ABHA Address does not match with KYC details. 

ABDM-1044 Broadcast Failed 

ABDM-1045 Database Access is restricted 

ABDM-1046 Invalid Purpose 

ABDM-1047 Purpose does not exist 

ABDM-1048 Timeout 

ABDM-1049 Invalid Profile Share Intent Keys 

ABDM-1050 Invalid Profile Share Metadata Keys 

ABDM-1051 Invalid ABHA Number or ABHA Address 

ABDM-1052 Invalid TransactionId or response's requestId 

ABDM-1053 Data already exists 

ABDM-1054 Invalid Subscription Request Id 

ABDM-1401 HIP is not available 

ABDM-1402 Acknowledgement is not received from HIP 

ABDM-9999 Unknown exception 

ABDM-1061 Consent artefact expired 

ABDM-1062 Consent Not granted 

ABDM-1063 Date Range given is invalid 

ABDM-1064 request with this request id already exists 

ABDM-1017 Invalid TransactionId 

ABDM-1109 ABHA DB service unavailable 

ABDM-1108 Notification DB service unavailable 

ABDM-1205 Document DB Gateway is unavailable 

ABDM-1034 Notification service unavailable 

ABDM-1029 Redis server is unavailable 

ABDM-1202 Document Gateway is unavailable 

ABDM-1200 LGD Gateway is unavailable 



---

ABDM-1201 IDP Gateway is unavailable 

ABDM-9999 Unknown exception 

ABDM-1101 

 This ABHA Address already exists. Please create with unique ABHA Address 

ABDM-1006 Invalid combinations of scopes 

ABDM-1100 

 You have requested multiple OTPs Or Exceeded maximum number of attempts for OTP match in this transaction. Please try again in 30 minutes. 

ABDM-1006 Bad Request, invalid request Body 



