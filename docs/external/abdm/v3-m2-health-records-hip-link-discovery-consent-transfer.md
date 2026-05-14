# M2 - Health Records (HIP Link, Discovery, Consent, Transfer)

> Source: ABDM Sandbox V3 Documentation
> File: M2_Document_16_02_2026_11822aedc7.docx

SANDBOX DOCUMENTATION    

\(ABDM\_Milestone 2\)    

    

Version 2\.8    

Created On 13\.02\.2026    

     

  	  

Contents  

[1 Base URL and X\-CM\-ID	4 ](#_Toc376258)

[2\.Terminology Definition:	4 ](#_Toc376259)

[3\.Gateway	4 ](#_Toc376260)

[3\.1 Overview	4 ](#_Toc376261)

[3\.2List of APIs	4 ](#_Toc376262)

[3\.2\.1 Auth token API	4 ](#_Toc376263)

[3\.2\.2 OpenID Configuration API	6 ](#_Toc376264)

[3\.2\.3 Keycloak Certificate API	7 ](#_Toc376265)

[3\.2\.4 Update bridge URL API	10 ](#_Toc376266)

[3\.2\.5 Registration of Facility & Software Linkage	11 ](#_Toc376267)

[3\.2\.6 Find bridge by service id	13 ](#_Toc376268)

[3\.2\.7 Find services by bridge id	15 ](#_Toc376269)

[4 HIP Initiated Linking	18 ](#_Toc376270)

[4\.1 Overview	18 ](#_Toc376271)

[4\.2   Sequence Diagram	18 ](#_Toc376272)

[4\.3   List of APIs	19 ](#_Toc376273)

[4\.3\.1 Link token generation	19 ](#_Toc376274)

[4\.3\.2 Callback API for Link token generation	25 ](#_Toc376275)

[4\.3\.3 Linking care context	34 ](#_Toc376276)

[4\.3\.4 Call back API for linking care context with patient ABHA address	42 ](#_Toc376277)

[4\.3\.5 Get all patient links	45 ](#_Toc376278)

[4\.3\.6 Notify care context update	48 ](#_Toc376279)

[4\.3\.7 Call back API for notify care context update	52 ](#_Toc376280)

[4\.3\.8 SMS Notification to patients	54 ](#_Toc376281)

[4\.3\.9 Callback API for SMS Notification to patients	57 ](#_Toc376282)

[5\.User Initiated Linking	59 ](#_Toc376283)

[5\.1 Overview	59 ](#_Toc376284)

[5\.2 Sequence Diagram	60 ](#_Toc376285)

[5\.3List of APIs	62 ](#_Toc376286)

[5\.3\.1 Patient Health record discovery	62 ](#_Toc376287)

[5\.3\.2 HIE\-CM callback to HIP \- Discovery	65 ](#_Toc376288)

[5\.3\.3 HMIS/LMIS response on health record discover	67 ](#_Toc376289)

[5\.3\.4 HIE\-CM callback on Health record discover	74 ](#_Toc376290)

[5\.3\.5 Patient health record link init	76 ](#_Toc376291)

[5\.3\.6 HIE\-CM callback on health record link init	81 ](#_Toc376292)

[5\.3\.7 HMIS/LMIS response on health record link	84 ](#_Toc376293)

[5\.3\.8 HIE\-CM response on health record link	90 ](#_Toc376294)

[5\.3\.9 Patient health record confirm	93 ](#_Toc376295)

[5\.3\.10   HIE\-CM callback for health record confirmation	96 ](#_Toc376296)

[5\.3\.11 HMIS/LMIS response on health record confirm	97 ](#_Toc376297)

[5\.3\.12  HIE\-CM response on health record on\-confirm	101 ](#_Toc376298)

[6\.Data Flow	103 ](#_Toc376299)

[6\.1 Overview	103 ](#_Toc376300)

[6\.2 Sequence Diagram	103 ](#_Toc376301)

[6\.3 List of APIs	104 ](#_Toc376302)

[6\.3\.1 Callback API to HIP when a consent request is APPROVED/REVOKED	104 ](#_Toc376303)

[6\.3\.2 HIP to respond back to consent HIP notify	109 ](#_Toc376304)

[6\.3\.3 Data Flow \- Health information request – Callback to HIP	111 ](#_Toc376305)

[6\.3\.4 HIP acknowledgement to the health information request	113 ](#_Toc376306)

[6\.3\.5 HIP calling data push URL	115 ](#_Toc376307)

[6\.3\.6 Health Information notify API	118 ](#_Toc376308)

[7\.Scan and Profile Share	121 ](#_Toc376309)

[7\.1 Overview	121 ](#_Toc376310)

[7\.2 Sequence Diagram	122 ](#_Toc376311)

[7\.3 List of APIs	122 ](#_Toc376312)

[7\.3\.1 Profile share	122 ](#_Toc376313)

[7\.3\.2 Profile share – Callback	126 ](#_Toc376314)

[7\.3\.3 Profile on\-share	129 ](#_Toc376315)

[7\.3\.4 Profile on share – Callback	132 ](#_Toc376316)

[8\.API Listing	134 ](#_Toc376317)

[9\.Error Codes Listing	138 ](#_Toc376318)

 

  

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

 

# <a id="_Toc376258"></a>1 Base URL and X\-CM\-ID    

Environment    

Base URL    

X\-CM\-ID    

Sandbox    

https://dev\.abdm\.gov\.in    

Sbx    

Production    

https://apis\.abdm\.gov\.in    

Abdm    

    

# <a id="_Toc376259"></a>2\.Terminology Definition:    

__Bridge ID:__ Is client ID which provided by NHA to HIP \(Its alphanumerical eg:    

SBX\_00XXXX\)    

__Service ID:__ Is Facility ID which is generated from NHPR application \(Its alphanumeric eg: IN02100000XX\)    

# <a id="_Toc376260"></a>3\.Gateway    

## <a id="_Toc376261"></a>3\.1 Overview    

This is the key ABDM building block that manages ABHA addresses, maintains links to health data for each ABHA address and manages consents provided by the user for sharing of their health data\. It also supports exchange of interoperable health data between HIPs and HIUs\. The HIE\-CM enables exchange of personal health data with consent as per the Health Data Management Policy issued by NHA\.     

    

## <a id="_Toc376262"></a>3\.2List of APIs    

### <a id="_Toc376263"></a>	 	 3\.2\.1 Auth token API       	    	    	    	    	    	    

This API will be invoked to generate auth token\.    

__URL:__ /api/hiecm/gateway/v3/sessions    

__Request:__ POST    

__Header Parameters: __   

Property Name    

Example Value    

Required    

Description    

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endtoend request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

Sbx    

Yes     

Suffix of the consent manager to which the request was intended\.    

__Body Parameters: __   

Property Name    

Example Value    

   

Required    

Description    

clientId    

SBX\_XXXXXX    

Yes    

   

Client id for authentication    

clientSecret    

“XXXXXXXXXXXXX”    

Yes    

   

Client secret for authentication    

grantType    

client\_credentials    

Yes    

   

Grant type for authentication  

__Request Body: __   

  

__Request Body __   

\{    	  

    "clientId": "SBX\_XXXXX",    

    "clientSecret": "XXXX\-XXX\-XXXX\-XXXX\-XXXXXXX",       

"grantType": "client\_credentials"    \}    

__ __   

__ __   

__ __   

__ __   

__ __   

__Response: __   

__ __   

__Response __   

Code : 202 Accepted     

\{    

    "accessToken":    

"eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJBbFJiNVdDbThUbTlFSl9JZk85ejA2ajlvQ3Y1MXBLS  0ZrbkdiX1RCdkswIn0\.eyJleHAiOjE3MjMyMjU3MTEsImlhdCI6MTcyMzIyNDUxMSwianRpIjoiMzE3MjVkN2Qt   

NmM1Mi00OWE0LTk0M2MtZmY2ZjhkNjNhYmRlIiwiaXNzIjoiaHR0cHM6Ly9kZXYubmRobS5nb3YuaW4vYX   

V0aC9yZWFsbXMvY2VudHJhbC1yZWdpc3RyeSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJjN2NhMjk3Yi0yZTVh   

LTRkN2UtOGY5YS0xYWU2NDAxYWQ0Y2YiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJTQlhfMDAwMTM1Iiwic2Vzc 2lvbl9zdGF0ZSI6IjhiYjQ4ZGM5LTJmMDUtNDA0OC05MGUxLWRjYjgxNWRmOGU5MyIsImFjciI6IjEiLCJhbGx vd2VkLW9yaWdpbnMiOlsiaHR0cDovL2xvY2FsaG9zdDo5MDA3Il0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6W yJIaWRJbnRlZ3JhdGVkUHJvZ3JhbSIsIkhJVV9QQVlFUiIsImhmciIsImhpdSIsIm9mZmxpbmVfYWNjZXNzIi wiaGVhbHRoSWQiLCJwaHIiLCJPSURDIiwiaGVhbHRoX2xvY2tlciIsImhpcCIsImhwX2lkIl19LCJyZXNvdXJjZV 9hY2Nlc3MiOnsiU0JYXzAwMDEzNSI6eyJyb2xlcyI6WyJ1bWFfcHJvdGVjdGlvbiJdfSwiYWNjb3VudCI6eyJy b2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19f Swic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsImNsaWVudEhvc3QiOiIxMDAuNjUuMTYwLjIxNCI sImNsaWVudElkIjoiU0JYXzAwMDEzNSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicHJlZmVycmVkX3VzZXJ uYW1lIjoic2VydmljZS1hY2NvdW50LXNieF8wMDAxMzUiLCJjbGllbnRBZGRyZXNzIjoiMTAwLjY1LjE2MC4yMTQi  fQ\.L56AYZYfzFrO\_gNedAbSwR9foEO661z2cMGEeOKsz2ZXsIpTb9oLd9fmRiixIS7ToGoW2VzzXC14qrXnwZIqknBZchTRJrmyGk6iRJ NQYR4k12hrn4tbdW\- h5e9m4NWFAvPtGbBUyKA8gotrne9fn7T0MOC7N\_J8TS3JLr2gothJSgc9P3VDKm8c6zpAObQPmwEpH qJH6j2Q07nGsoaBygxovoIeFn6G6zwIa\-\_mKw\_a86L\_CYxr8Gxw5\-   

5PXkh2XwYp\_xLIiJ3t7vLM97UFThwSn\_TmRF6W1LH145m\_6NxY4hQclHi1elK3OP4LvR1SLDwtAQZSCm4Jpihd0uMw",    

    "expiresIn": 1200,      "refreshExpiresIn": 1800,    

    "refreshToken":    

"eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIyMWU5NzA4OS00ZTcxLTQyNGEtOTAzYS1jOTAyMW   

M1NmFlNWYifQ\.eyJleHAiOjE3MjMyMjYzMTEsImlhdCI6MTcyMzIyNDUxMSwianRpIjoiZGY5ODdmYzQtYzdk  Ni00OGNmLTliM2EtNzRmNWVkMTljMmNmIiwiaXNzIjoiaHR0cHM6Ly9kZXYubmRobS5nb3YuaW4vYXV0a C9yZWFsbXMvY2VudHJhbC1yZWdpc3RyeSIsImF1ZCI6Imh0dHBzOi8vZGV2Lm5kaG0uZ292LmluL2F1dGg vcmVhbG1zL2NlbnRyYWwtcmVnaXN0cnkiLCJzdWIiOiJjN2NhMjk3Yi0yZTVhLTRkN2UtOGY5YS0xYWU2ND AxYWQ0Y2YiLCJ0eXAiOiJSZWZyZXNoIiwiYXpwIjoiU0JYXzAwMDEzNSIsInNlc3Npb25fc3RhdGUiOiI4YmI0O GRjOS0yZjA1LTQwNDgtOTBlMS1kY2I4MTVkZjhlOTMiLCJzY29wZSI6Im9wZW5pZCBlbWFpbCBwcm9maWx lIn0\.\_cOnTXMf2bObS1nySL\-AjvM5PQxgCHJRm2oO66nrx1M",    

    "tokenType": "bearer"    

\}    

__ __   

### <a id="_Toc376264"></a>	 	 3\.2\.2 OpenID Configuration API     	    	    	    	    	    

Openid\-configuration API, defined within OpenID Connect which provides configuration information about the Identity Provider \(IDP\)\.    

__URL:__ /api/hiecm/gateway/v3/\.well\-known/openid\-configuration __Request:__ GET  __Header Parameters: __   

    

Property Name    

Example Value    

Required    

Description    

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endtoend request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

Sbx    

Yes     

Suffix of the consent manager to which the request was intended\.    

__ __   

__Response: __   

__ __   

Response    

Code : 202 OK    

\{    

    "jwks\_uri": "https://dev\.abdm\.gov\.in/api/hiecm/gateway/v3/certs"    

\}    

    

### <a id="_Toc376265"></a>	  	3\.2\.3 Keycloak Certificate API     	    	    	    	    	    	    

In response to open ID configuration API, Keycloak, the open\-source identity provider, provides an OAuth certificate that can be used with open source authentication requests for certificates\.    

__URL:__ /api/hiecm/gateway/v3/certs    

__Request:__ GET    

__Header Parameters: __   

Property Name    

Example Value    

Required    

Description    

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endtoend request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

sbx    

Yes     

Suffix of the consent manager to which the request was intended\.    

__ __   

__Response: __   

__ __   

Response    

Code : 202 OK    

\{    

    "keys": \[    

        \{    

            "e": "AQAB",    

            "kid": "AlRb5WCm8Tm9EJ\_IfO9z06j9oCv51pKKFknGb\_TBvK0",    

            "kty": "RSA",    

            "n": "mgmW7W5ZGF\_G5cJevwYi8HiPcI\-6qS\_psnZxa4v3bkwAkyOoOd8\-6ketrOI\-   

ZA2PbRbGnxFfZHiI94rdFXJ4Q9ampscsz9NocTIPMPmWydJ8A50pZaYWyikYDSJiDltq7i3WspPKSOuQHrC   

5h9dMcCVveX5oeg0tO68Z79gwDlpcxiqDbFaphsqDvx\-   

5XkfwiqvOBaybK6\_BCBPuTqWMUEuUklLYXu2X7ESHdVNFMFAjxCcCXUtP7LFdvT3nnFekRmG82QbSQSVe   4N5tPH8q0MCxSWWn2c15bDnzOF\-dvfRCVPRabCzw0M\-utHR9diTrWtq6Koi5buxgwM1rbk0p8Q",    

            "use": "sig",    

            "x5c": \[    

                   

"MIICrzCCAZcCBgFy/3WZBjANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBjZW50cmFsLXJlZ2lzdHJ5  

MB4XDTIwMDYyOTA5NDEzNloXDTMwMDYyOTA5NDMxNlowGzEZMBcGA1UEAwwQY2VudHJhbC1yZWdpc   

3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJoJlu1uWRhfxuXCXr8GIvB4j3CPuqkv6b J2cWuL925MAJMjqDnfPupHraziPmQNj20Wxp8RX2R4iPeK3RVyeEPWpqbHLM/TaHEyDzD5lsnSfAOdKWW mFsopGA0iYg5bau4t1rKTykjrkB6wuYfXTHAlb3l\+aHoNLTuvGe/YMA5aXMYqg2xWqYbKg78fuV5H8Iqrzg WsmyuvwQgT7k6ljFBLlJJS2F7tl\+xEh3VTRTBQI8QnAl1LT\+yxXb0955xXpEZhvNkG0kElXuDebTx/KtDAsUllp9   

   

  

 

nNeWw58zhfnb30QlT0Wmws8NDPrrR0fXYk61rauiqIuW7sYMDNa25NKfECAwEAATANBgkqhkiG9w0BAQs FAAOCAQEACkC3TijrXIgi4vn\+l1uL1nfdK6vOIL5UZ6yCjSOq7zYW6b3Qe8j7NrPb9RJC\+pbIERyNbB\+t9hsa5 g1L7lkjCNlUuxfJprsJ9LJKlM5g7dYEA6XPCJ7C6AVlarj72vlWXQvwjnQMO2/CM9/Jp5Hnv2Qwjn7NME2OW  M0iblc/TD\+DEZK5L5mlWMyuBSQo2o/AcOmfG4MoE5Gm/CaOJ47rSrf\+lq83e5\+dyKh7uLVAa\+5WK8Im   

5nEs6BLSGyo2KlaV0mW9yCkoRLLbipjH8\+rJwkUU6iu7QVjz0peGZzYldya5n35gMWH7Bu4HqFneKNRww D6w8rGNC\+uWtgWejDZ3yQ=="

            \],    

            "x5t": "EaMhYGUIvMkp8tvSM3QoaqaF8xM",    

            "x5t2": "vGer6Pt8AhZn8RlbHhAFksOCcGf3u1UWU7Qq\-Doy7ro",    

            "alg": "RS256"    

        \},    

        \{    

            "e": "AQAB",    

            "kid": "oc\-l6O1yJ7wJKYEeyeUafsz3Aecq7YnCIqbzbIfkJk8",    

            "kty": "RSA",               "n":    

"jDOehgMzurNQT0WJCTWN6a34639uIKOLO1LnXZes\_kTakWh6iRxmkExLLCD7MJjz9aijTHwIuKAtOCSbFO pwbqSfF6dMBS2c8cv0AU3pE8

BuUriwr9BUYSUW8SM68QH\_HCaz2mmN\_Z8ynTQ4kWw\_Idj\-  enVpkHYtq00DriG98l6RXF1Ao9Kd16ctoNbthuQYH0RSRIXnt0Qtm4GSAY7abPCNa64mir0auldU72DJHXwDo6g5OGz6EMm86ZAV\_pvh\_5Y IMxv0yMMKFZjkFGA0QKYMkMTC5ruLaE7cec\-njA7dJQnQ",    

            "use": "sig",    

            "x5c": \[    

                   

"MIICrzCCAZcCBgGHxvQVmDANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBjZW50cmFsLXJlZ2lzdHJ   5MB4XDTIzMDQyODA4MTk1N1oXDTMzMDQyODA4MjEzN1owGzEZMBcGA1UEAwwQY2VudHJhbC1yZWdpc  

3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIwznoYDM7qzUE9FiQk1jemt\+Ot/biCjiztS   

512XrP5E2pFoeokcZpBMSywg\+zCY8/Woo0x8CLigLTgkmxTqcG6knxenTAUtnPHL9AFN6RPJEjKRiSg2fXYg PgblK4sK/QVGElFvPkjOvEB/xwms9ppjf2fMp00OJFsPyHY/np1aZB2LatNA64hvfJekVxdQKPSndenLaDW7Y bkGB9EUkSF57dELZuBkgGO2mzwjWuuJoq9PmrpXVPu9gyR18A6OoOThs\+hDJvOmQFf6b4f\+WMxaX5FA PEytixVQJgt1KfiDMb9MjDChWY5BRgNECmDJDEwua7i2hO3HnPp4wO3SUJ0CAwEAATANBgkqhkiG9w0B   

AQsFAAOCAQEABYAcXOSr\+WgOxKVmygID9WjB4rDuAVDyU3GmjBvckdWhYJuBX8Vs04hNVNgf904gqy  

\+D5wZIQU985stK3PdogFGN2jVw2kO9G3hG4/7uwYKqciKApT/pSPMeHRltHGp/Mwr6e5poVwgQyrn\+Be   

H373U1Q6eB1QUYnElP\+16y7bbvQhfDAS2X9sqdfurB9YIL5xZMPddZaf7pPX8oWOVlB0XH1JEZfsX125qq0Xn  

K8z/Rd8KI8zTfJw6D2Kzrk1WvQSlM5KnTQmcSk3kwDlW5Dg657dT49Y68mI4azq34q17JgBhTx3IbTuf94QT w7QC5wmFtO\+hc6zPVODX8JW

 

            \],    

            "x5t": "\-HZ\-fkkNBhTsPHWrhATwlZflhdU",    

            "x5t2": "tjVDNCTx7Fn0TfM\-6uHvbwjWlIxIaFtGxiZZ6uJFxr4",    

            "alg": "RS512"    

        \}    

    \]    

\}    

__ __   

### <a id="_Toc376266"></a>3\.2\.4 Update bridge URL API     

This API will be called to update the bridge base URL\.    

__URL:__ /api/hiecm/gateway/v3/bridge/url   

__Request:__ PATCH   

__Header Parameters:__    

Property Name    

Example Value    

   

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac   

2J4IiwiY2xpZW50SWQiOi 

JzYngiLCJzeXN0ZW0iOiJ   

BQkhBLUEiLCJyZXF1ZXN0Z   

XJJZCI6IlBIUi1XRUIiLCJwa   

HJNb2JpbGUiOm51bGws    

Yes    

   

JWT Access token which was issued by ABDM session API after successful validation of client id and secret\.    

REQUEST\-ID     

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

Yes     

   

Unique UUID for tracking the end\-to\-end request transaction     

TIMESTAMP     

2022\-10\-   

06T10:10:00\.587Z     

Yes     

   

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

sbx    

Yes     

   

Suffix of the consent manager to which the request was intended\.    

__ __   

__ __   

__ __   

  

__Body Parameters: __   

Property Name    

Example Value    

   

Required    

Description    

url    

https://webhook\.site/b7   

99c0b8\-4e75\-4545\- 8eb2d8c2d5f0c9f6    

Yes    

   

Bridge base URL    

__Request Body: __   

Request Body    

\{    

    "url": "https://webhook\.site/b799c0b8\-4e75\-4545\-8eb2\-d8c2d5f0c9f6"    

\}    

__ __    

__Response: __   

__ __   

Response    

Code : 202 Accepted    

    

### <a id="_Toc376267"></a>3\.2\.5 Registration of Facility & Software Linkage    

    

__Overview:__ The software being used by the provider must integrate with the digital building blocks of ABDM and comply with the guidelines outlined NHA\. NHA maintains the national directory of all healthcare facilities\. Any participating facility needs to sign up in the health facility registry at \(nhpr\.abdm\.gov\.in\) This ensures that they are a valid facility which is authorized to issue health records in the ecosystem\. HFR consists of information for each healthcare facility in the country – hospitals, clinics, diagnostic centres, pharmacies etc\., across all systems of medicine and covering both public and private health facilities\. HFR offers APIs that can be used by various stakeholders in the ecosystem\. Healthcare information service provider application or healthcare repository provider application must be upgraded to become ABDM compliant\.    

    

__Registration of facility: __   

__ __   

__Through website__: https://hspsbx\.abdm\.gov\.in/home \(sandbox\) , https://nhpr\.abdm\.gov\.in/home \(production\)   __Step\-by\-step user manual document access:  __   

Goto https://hspsbx\.abdm\.gov\.in/home \(sandbox\), https://nhpr\.abdm\.gov\.in/home   

\(production\) >>Resource center >> User Manual    

>> Select “For Health Fecility” >>Download “User Manual” >>Refer Content    

“A” \(Health Professional ID \(HPID\) creation\), “B” \(Facility Registration\) __Registration of bridge services \(HIP/HIU\) on facility: __   

    

__Option 1__: Linking through website: https://hspsbx\.abdm\.gov\.in/home \(sandbox\), https://nhpr\.abdm\.gov\.in/home \(production\)  __Step\-by\-step user manual document access:  __   

Goto: https://hspsbx\.abdm\.gov\.in/home \(sandbox\) , https://nhpr\.abdm\.gov\.in/home \(production\)    >>Resource center >> User Manual >> Select “For Health Facility” >>Download “User Manual” >>Refer Content “C” \(Software Linkage\)\.    

    

__Option 2: Through API __ This API  \([https://apihspsbx\.abdm\.gov\.in/v4/int/v1/bridges/MutipleHRPAddUpdateServices](https://apihspsbx.abdm.gov.in/v4/int/v1/bridges/MutipleHRPAddUpdateServices) \) will be used to link multiple bridges against a facility\. It will accept the facility id , facility name and list of HRP i\.e\. bridges\.     

Please note:      

- You must pass in all the required parameters to create the API\.      
- The data needs to be passed in the required format as mentioned for each field\.      

__API can refer swagger link : __  

[https://apihspsbx\.abdm\.gov\.in/v4/int/swagger\-ui\-ext/index\.html\#/Multiple%20HRP%20API/facilityAddAndUpdate](https://apihspsbx.abdm.gov.in/v4/int/swagger-ui-ext/index.html#/Multiple%20HRP%20API/facilityAddAndUpdate) >>>Go to Multi HRP API >>>and Select    

“/v1/bridges/MutipleHRPAddUpdateServices v1MutipleHRPAddUpdateServices”    

     

Parameters:     

__Params__      

__Required__    

__Description__      

   

__Data __ 

__type__      

      

__Format if any__     

      

   

__facilityId__      

Yes      

Will be validated if present in   

HFR or not      

String      

Starting with IN and of 12 characters      

__facilityName__     

Yes      

      

Name of the facility to be linked 

String      

Alphanumeric    

__bridgeId__      

      

Yes      

Valid Bridge Id to be linked\.       

String      

Alphanumeric and validity to be checked 	by 

HIECM  

__hipName__      

Yes     

• To provide uniqueness against each bridges that is linked  \. HIP name is the   

  String      

         	     

      

• HIP name can be the Hospital

name added    

   

   

name   of   the   hospital which will reflect    

     

with  suffix  of bridge name\.    

example     

    

    

on ABHA/PHR app when   	  the patent will search respective hospital\.  

       

   

Hospital    

name=XYZ  

and  bridge name =BRIDGE TEST, so the HIP name = 

XYZ  BRIDGE\.     • HIP name can not be more    

than   15  characters\., No special    

character    	is allowed   

\(%$\*\#@\(~&\!\), and it should be unique for every    	bridge   

for a facility     

__type __    

Yes      

 HIP / HIU etc     	  	  

String      

 Validated by   

HIECM     

__Active __    

Yes      

      

True/false      

boolean     

Accept    

Boolean value    

     

### <a id="_Toc376268"></a>3\.2\.6 Find bridge by service id    

This API will fetch the bridge details for the given service id\.    

__URL:__ /api/hiecm/gateway/v3/bridge\-service/serviceId/\{serviceId\}    

__Request:__ GET  __ __   

__Header Parameters:__    

Property Name    

Example Value    

   

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac   

2J4IiwiY2xpZW50SWQiOi JzYngiLCJzeXN0ZW0iOiJ   

BQkhBLUEiLCJyZXF1ZXN0Z   

XJJZCI6IlBIUi1XRUIiLCJwa  HJNb2JpbGUiOm51bGws  

ImV4cCI6MTY2NzI5ODEx   NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0    

Yes    

   

JWT Access token which was issued by ABDM session API after successful validation of client id and secret\.    

REQUEST\-ID     

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

Yes     

   

Unique UUID for tracking the end\-to\-end request transaction     

TIMESTAMP     

2022\-10\-   

06T10:10:00\.587Z     

Yes     

   

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

sbx    

Yes     

   

Suffix of the consent manager to which the request was intended\.    

__ __   

__Response: __   

__ __   

 

Response    

Code : 200 Ok    

 

\{    

    "id": 1561,    

    "bridgeId": "SBX\_XXXX",    

    "serviceId": "TestClinicHIP",    

    "name": "TestClinicHIP",    

    "isHip": true,    

     "isHiu": true,    

    "isPhr": false,    

    "endpoints": \{\},    

    "active": true,    

    "registerTime": "2021\-03\-01 11:17:35\.1735",    

    "dateCreated": "2021\-03\-01 11:17:35\.1735",    

    "dateModified": "2024\-04\-22 11:04:46\.446"    

\}  

 

    

### <a id="_Toc376269"></a>3\.2\.7 Find services by bridge id    

This API will fetch all the service ID details linked with the respective bridge id\.    

__URL:__ /api/hiecm/gateway/v3/bridge\-services'  

__Request:__ GET   

 __Header Parameters:__    

Property Name    

Example Value    

   

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac   

2J4IiwiY2xpZW50SWQiOi   

JzYngiLCJzeXN0ZW0iOiJ   

BQkhBLUEiLCJyZXF1ZXN0Z   

XJJZCI6IlBIUi1XRUIiLCJwa   

HJNb2JpbGUiOm    

Yes    

   

JWT Access token which was issued by ABDM session API after successful validation of client id and secret\.    

REQUEST\-ID     

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

Yes     

   

Unique UUID for tracking the end\-to\-end request transaction     

TIMESTAMP     

2022\-10\-   

06T10:10:00\.587Z     

Yes     

   

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

sbx    

Yes     

   

Suffix of the consent manager to which the request was intended\.    

__ __   

__ __   

__Response: __   

__ __   

  

  	Response    

Code : 200 Ok    

  	  

\{    

    "bridge": \{    

        "id": "SBX\_XXXX",    

        "name": "Testing",    

        "url": "https://abdcb\.doctor9\.com",    

        "active": true,    

        "blocklisted": false    

    \},    

    "services": \[    

        \{    

            "id": "@\#$%^&\*\(",    

            "name": "hello",    

            "types": \[    

                "HIP",    

                "HIU"    

  	  

            \],    

            "endpoints": \{    

                "hipEndpoints": \[    

                    \{    

                        "use": "registration",    

                        "connectionType": "HTTPS",                           

"address":  

"https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/registration"    

   

  

                    \},    

                    \{    

                        "use": "data\-upload",    

                        "connectionType": "HTTPS",                           

"address":  

"https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/dataupload"    

                    \}    

                \],    

                "hiuEndpoints": \[    

                    \{    

                        "use": "registration",    

                        "connectionType": "HTTPS",                           

"address":  

"https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/registration"    

                    \},    

                    \{    

                        "use": "data\-upload",    

                        "connectionType": "HTTPS",                           

"address":  

"https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/dataupload"    

                    \}    

                \],    

                "healthLockerEndpoints": \[    

                    \{    

                        "use": "registration",    

                        "connectionType": "HTTPS",                           

"address":  

"https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/registration"    

                    \},    	  

                    \{    

                        "use": "data\-upload",    

                        "connectionType": "HTTPS",                           

"address":  

"https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/dataupload"    

                    \}    

                \]    

            \},    

            "active": true    

        \}    

    \]    \}    

   

# <a id="_Toc376270"></a>4 HIP Initiated Linking    

## <a id="_Toc376271"></a>4\.1 Overview    

    

HIP\-initiated linking is the process through which a HIP links the patient’s care context \(health record\) with the patient's ABHA Address, after patient registration and creation of health records \(in their HMIS/LMIS system\)\.     

Care context \(Health record\) linking happens in two steps\.    

- Link token generation    
- Linking care context with ABHA address after obtaining a valid link token           

    

__Link token generation __   

To achieve linking, the HIPs need to have a valid link token using link token service    

The link token will be used for linking the ‘n’ number of care contexts, and concurrent linkages\.    

## <a id="_Toc376272"></a>	 	4\.2  	Sequence Diagram    

    

[image removed - see original document]        

[image removed - see original document]    

    

## <a id="_Toc376273"></a>	 	4\.3  	List of APIs    

    

### <a id="_Toc376274"></a>4\.3\.1 Link token generation    

    

This API invoked by HIP or HRP to generate a link token\.    

__URL:__ /api/hiecm/v3/token/generate\-token __Method:__   

POST __Request Headers: __   

__ __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8    

Yes    

Unique UUID for tracking the end\-toend request transaction    

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

The actual time when the request was initiated, ISO Date time format represents the date and time    

Authorization    

eyJhbGciOiJSUzUxMiJ9\.   

eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2    

YW5Ac2J4IiwiY2xpZW50SWQiOiJz    

YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL    

CJwaHJNb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwia    

WF0IjoxNjY3MjkwOTE1LCJwaHJBZ    

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX    

NhdmFuQHNieCIsInR4bklkIjoi    

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O    

WQtYzNlMTUwOTE3ZGY1In0    

Yes    

JWT Access token which was issued by ABDM session API after successful validation of client id and secret    

X\-HIP\-ID    

IN2810014366    

Yes    

Identifier of the health information provider to which the request was intended    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

__ __   

__ __   

__Body Parameters: __   

__ __   

Property Name    

Example  Value    

Required    

Description    

abhaAddress    

“ABHA address”    

Yes \(if ABHA number is not provided\)    

Patient ABHA address against which the health records need to be linked\.    

abhaNumber    

ABHA number    

Yes \(if ABHA address is not provided\)    

14\-digit unique ABHA number of the patient\.    

Name    

“Full name”    

Yes    

Patient's full name in the following format  First Name | Middle Name | Last Name    

Gender    

“M”/”F”/”O”    

Yes    

Patient gender    

yearOfBirth    

XXXX    

Yes    

Patient's year of birth    

__ __   

__Request Body: __   

__ __   

Request Body__ __   

\{    

    "abhaNumber": 98765432101XXXX,    

    "abhaAddress": "user@sbx",    

\}    

    "name": "Arjun",    

    "gender": "M",    

    "yearOfBirth": XXXX    

__ __   

__Response Body: __   

__ __   

Response:__ __   

Code : 202 Accepted     

__* *__   

__Error scenarios: __   

__Scenario__    

__Request Headers/Body__    

__Message__    

When Request ID is Blank, null or empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

   

When invalid Request\- ID is pass in header     

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}    

\]    

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "",           

"type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1030: ",    

    "message": "Invalid request ID"    

\}    

Code: 400Bad Request     

     

Access Denied     

Code : 403 Forbidden     

    

    

\{    

    "code": "ABDM\-1016: ",    

    "message": "Invalid Timestamp"    

\}    

    

Code \- 400Bad Request    

When Timestamp is   Blank, null or empty in header\.     

When invalid    

Timestamp is pass in  header 

\[    

    \{    

        "key": "TIMESTAMP",            "value": "*\{\{$isoTimestamp\}\}*jh gftytgtyu",    

        "type": "text"    

    \}   \]    

When X\-HIP\-ID is Blank, null or empty in header\.      

\[    

    \{    

        "key": "X\-HIP\-ID",    

        "value": "",    

        "type": "text"    

    \}    

\]    

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"    

    \}   \]    

     

Access Denied     

Code : 403 Forbidden     

    

    

Access Denied     

Code : 403 Forbidden     

    

 \{    

    "code": "ABDM\-1064",    

    "message": "Request body was missi ng"    

\}    

    

Code : 400Bad Request    

    \{    

    "code": "ABDM\-1092",    

    "message": "Duplicate Link token req uest"   

\}    

    

Code : 400Bad Request    

When X\-CM\-ID is    

Invalid, Blank, null or empty in header\.     

 Request body missing    

Duplicate Link token request 

 \{    

    "abhaNumber": 9117838618XXXX,    

    "abhaAddress": "9117838610XXXX   

@sbx",    

    "name": "Mayur Chaskar",    

    "gender": "M",    

    "yearOfBirth": XXXX    

   

   

\}    

 \{    

    "abhaNumber": __null__,    

    "abhaAddress": __null__,    

    "name": "Mayur Bapu",    

    "gender": "M",    

    "yearOfBirth": XXXX \}    

    \{    

    "code": "ABDM\-1125",    

    "message": "ABHA number and ABH  A address cannot be null"    

\}    

    

Code \- 400Bad Request    

    

 ABHA number and ABHA 

address cannot be null    

     

When passing an abha number of more or less than 

14 digits    

\{    

    "abhaNumber": 911783861017XXX,    

      "abhaAddress": "91178386101731X   

XXX@sbx",    

    "name": "Mayur M ",    

    "gender": "M",    

    "yearOfBirth": XXXX \}    

 \{    

     "abhaNumber": 91178386109XXXX   

,    

    "abhaAddress": "9117838610XXX@ gmail\.com",    

    "name": "Mayur M",    

    "gender": "M",    

    "yearOfBirth": 1994 \}    

 \{    

    "abhaNumber":   	9117838610XXXX,

"abhaAddress": "911783861XXXX@ sbx",   

    "name": "Mferr",    

    "gender": "M",        "yearOfBirth": 1994    

\}    

    

    

   

\[    

    \{    

        "code": "ABDM\-9999: ",    

        "message": "Invalid ABHA Number, it must be only 14 digit"    

    \}   \]    

    

Code \- 400Bad Request    

   

\[    

    \{    

        "code": "ABDM\-9999: ",    

        "message": "Invalid ABHA Address,  it must start with Alphanumeric \. and  \_  in the middle and must be ending  with @abdm or @sbx"    

    \}   \]    

    

Code \- 400Bad Request    

    

 Callback: \{    

    "error": \{    

        "code": "ABDM\-1207: ",    

 

        "message":  "Demographic  details  was invalid or doesn't exists"    

    \},    

    "response": \{    

        "requestId": "58f080de\-b5444bcf\-8f4b\-  

3d45222b2885"    

    \}   \}      

Code\- 202Accepted    

    

 When passing invalid abha address/Invalid domain\.    

 When passing invalid   Name    

   

  

 

When passing invalid    

Gender except M, F, O,   D    

\{    

    "abhaNumber": 9117838610XXXX,    

    "abhaAddress": "9117838610XXXX   

@sbx",    

    "name": "Mayur B ",    

    "gender": "W",    

    "yearOfBirth": XXXX \}    

\{    

    "abhaNumber":   	9117838610XXX,

"abhaAddress": "9117838610XXX@ sbx",   

    "name": "Mayur B",    

    "gender": "M",         "yearOfBirth": XX    

\}    

\[    

    \{    

        "code": "ABDM\-9999: ",    

        "message": "Invalid Gender, It mus t be M, 

F, O, D"    

    \}   \]    

    

Code\- 400Bad Request    

\[    

    \{    

        "code": "ABDM\-9999: ",    

        "message": "Invalid Year of birth, must be  

4 digit range between 1900 a nd 2200"    

    

\}   \]     

    

Code\- 400Bad Request    

Callback: \{    

    "error": \{    

        "code": "ABDM\-1207: ",    

        "message": "Demographic details was invalid or doesn't exists"    

    \},    

    "response": \{    

        "requestId": "89d2dcb4\-06a545fa\-8910\-  

417d6e83bdd5"    

    \}   \}    

    

Code\- 202Accepted    

Callback: \{    

    "error": \{    

        "code": "ABDM\-1207: ",    

        "message": "Demographic details was invalid or doesn't exists"    

    \},    

    "response": \{    

        "requestId": "58f080de\-b5444bcf\-8f4b\-  

3d45222b2885"    

    \}   \}    

    

Code\- 202Accepted    

Callback: \{    

    "error": \{    

        "code": "ABDM\-1207: ",    

Year Of Birth should be in between 1900 to 2200\.    

When passing F, O, D gender for male\.    

\{    

    "abhaNumber": 9117838610XXXX,    

    "abhaAddress": "9117838610XXXX   

@sbx",    

    "name": "Mayur B ",    

    "gender": "F",    

    "yearOfBirth": XXXX \}    

When Year of birth not matching with user’s YearOfBirth\.     

\(Allowing \+2 & \-2 from original year\)    

\{    

    "abhaNumber": 9117838610XXXX,    

    "abhaAddress": "9117838610XXXX    

@sbx",    

    "name": "Mayur B",    

    "gender": "M",    

    "yearOfBirth": XXXX \}    

When abha numbe  r is passing of another’s user\.   

\{    

    "abhaNumber": 9117838610XXXX,    

    "abhaAddress":  	"9117838610XXXX

@sbx",    

  

   

    "name": "Mayur B ",    

    "gender": "F",    

    "yearOfBirth": XXXX \}    

 

        "message": "Demographic details was invalid or doesn't exists"    

    \},    

    "response": \{    

        "requestId": "58f080de\-b5444bcf\-8f4b\-  

3d45222b2885"    

    \}   \}    

    

Code\- 202Accepted    

Callback: \{    

    "error": \{    

        "code": "ABDM\-1207: ",    

        "message": "Demographic details was invalid or doesn't exists"    

    \},    

 

When abha Address is passing of another’s user\.    

    

\{    

    "abhaNumber": 9117838610XXXX,    

    "abhaAddress": "9117838610XXXX    

@sbx",    

    "name": "Mayur B",    

    "gender": "F",        "yearOfBirth": XXXX    

\}    

    

    "response": \{    

        "requestId": "89d2dcb4\-06a545fa\-8910\-  

417d6e83bdd5"    

    \}   \}    

    

Code\- 202Accepted    

Callback: \{    

    "abhaAddress": "91178386101731@sbx   

",    

    "error": \{    

        "code": "ABDM\-1027: ",    

        "message": "You are blocked\. Plea se try again after 24 hours\."    

    \},    

When the user tries to generate a link token more than 3 times    

\{    

    "abhaNumber": 9117838610XXXX,    

    "abhaAddress": "9117838610XXXX    

@sbx",    

    "name": "Mayur B",    

    "gender": "M",        "yearOfBirth": XXXX    

\}    

    

    "response": \{    

        "requestId": "ddcd6213\-49e24d46\-ad44\-  

07897c63c36b"    

    \}   \}    

    

__ __   

### <a id="_Toc376275"></a>4\.3\.2 Callback API for Link token generation    

__ __   

This is a callback API triggered by HIE\-CM to HIP/HRP to get the link token\.    

__URL:__ \{callback\_url\}/api/v3/hip/token/on\-generate\-token    

__Method:__ POST    

__ __   

__ __   

__ __   

__ __   

__Request Headers: __   

__ __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8    

Yes    

Unique UUID for tracking the end\-toend request transaction__\. __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-HIP\-ID    

IN2810014366    

Yes    

Identifier of the health information provider to which the request was intended\.    

Authorization    

eyJhbGciOiJSUzUxMiJ9\.  

eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2    

YW5Ac2J4IiwiY2xpZW50SWQiOiJz    

YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL    

CJwaHJNb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwia    

WF0IjoxNjY3MjkwOTE1LCJwaHJBZ    

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX    

NhdmFuQHNieCIsInR4bklkIjoi    

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O    

WQtYzNlMTUwOTE3ZGY1In0    

Yes    

JWT Access token which was issued by ABDM session API after successful validation of client id and secret    

__ __   

__Body parameters: __   

__ __   

Property    

Name    

 

Example Value    

Required   

Description  

abhaAddress   

ABHA address    

 

Yes \(if ABHA number is not provided\)    

Patient ABHA address against which the health records need to be linked    

linkToken    

eyJhbGciOiJSUzUxMiJ9\.eyJoaXBJZCI6Ik1BRE hVUkFfSElQIiwic3ViIjoiMTAwMDAyNjIxMzE2N DBAYWJkbSIsImFiaGFOdW1iZXIiOjEwMDAwM jYyMTMxNjQwLCJleHAiOjE2OTc1OTY2MDAsI mlhdCI6MTY4MTgyODYwMCwidHJhbnNhY3 Rpb25JZCI6IjM1YjkzYzQwLWM1OGQtNDk2ZC   

04MDgxLWY1OTM0MWVkNGNkNSIsImFiaGFB  ZGRyZXNzIjoiMTAwMDAyNjIxMzE2NDBAYWJk bSJ9\.q\-  

p8eHxdacvSg2QPzm7vY7\_kLHYCQXwkbkAc EvSwcp5HFAdtUyNoZ50LyquQih2Lbxv0Dxm   

Da3YxyMnQY37GJsBpcs\-   

4OQmUk5tvoad1HYGjBVMlq0tVae7gpFHno nSSyhkVPGLTO5G4tvghvcK8xcMqoQol\_lmR   

26VIGCue07nx6K4xPueUOQeeqKMXPJs115wPunafT3LT24  

k9KEHzbmDcWDJjUouBZ4TKAXcGrfwOuhG   

M0eWr\-   

SMZ99PAlTHxHCZnJybUWL9E2MH6bpq87wD hFPrq0WLzhLJhynnfaWxrd7JkFdUtDygkpaiR h3V12xVqx8eWaSwxdwvCLut4A    

Yes    

Patient full name:    First Name |    

Middle Name |   

Last Name    

requestId    

d6d6d056\-666a\-4af8\-b6804c61bcb29dd4    

Yes    

Unique UUID to 

track the   

endtoend  flow    

__ __   

__Request Body: __   

__ __   

Request Body__ __   

\{    

    "abhaAddress": "10000262131640@sbx",    

    "linkToken": "eyJhbGciOiJSUzUxMiJ9\.eyJoaXBJZCI6Ik1BREhVUkFfSElQIiwic3ViIjoiMTAwMDAyNjIxMzE2 NDBAYWJkbSIsImFiaGFOdW1iZXIiOjEwMDAwMjYyMTMxNjQwLCJleHAiOjE2OTc1OTY2MDAsImlhdCI6MT Y4MTgyODYwMCwidHJhbnNhY3Rpb25JZCI6IjM1YjkzYzQwLWM1OGQtNDk2ZC04MDgxLWY1OTM0MWV kNGNkNSIsImFiaGFBZGRyZXNzIjoiMTAwMDAyNjIxMzE2NDBAYWJkbSJ9\.q\- p8eHxdacvSg2QPzm7vY7\_kLHYCQXwkbkAcEvSwcp5HFAdtUyNoZ50LyquQih2Lbxv0DxmDa3YxyMnQ Y37GJsBpcs\-  

4OQmUk5tvoad1HYGjBVMlq0tVae7gpFHnonSSyhkVPGLTO5G4tvghvcK8xcMqoQol\_lmR26VIGCue07   

\-  

nx6K4xPueUOQeeqKMXPJs115wPunafT3LT24k9KEHzbmDcWDJjUouBZ4TKAXcGrfwOuhGM0eWrSMZ99PAlTHxHCZnJybUWL  

9E2MH6bpq87wDhFPrq0WLzhLJhynnfaWxrd7JkFdUtDygkpaiRh3V12xVqx8 eWaSwxdwvCLut4A",    

    "response": \{    

        "requestId": "d6d6d056\-666a\-4af8\-b680\-4c61bcb29dd4"    

    \}   \}    

__ __   

__Response Body __   

__    	    	 __   

Response__ __   

Code : 202 Accepted     

__ __   

[image removed - see original document]__ __   

__ __   

__Error Scenarios: __   

__Scenario __   

__Headers/Body __   

__Message __   

When Request ID   is Blank, null or  empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied    

Code : 403 Forbidden     

    

    

When invalid Request\-  ID is pass in header     

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1030: ",    

    "message": "Invalid request ID"    

\}    

Code: 400Bad Request    

When Timestamp    is Blank, null or empty in header\.     

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

When invalid  Timestamp is pass in header    

\[    

    \{    

        "key": "TIMESTAMP",    

\{    

    "code": "ABDM\-1016: ",    

    "message": "Invalid Timestamp"    

\}    

    

   

        "value": "*\{\{$isoTimestamp\}\}*jhgftyt gtyu",      

"type": "text"    

    \}   \]    

Code \- 400Bad Request    

    

   

   

    

    

    

    

When X\-HIP\-ID is Blank, null or empty in header\.      

\[    

    \{    

        "key": "X\-HIP\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

    

When X\-CM\-ID is Invalid, Blank, null, or empty in the header\.    

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"         \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

When X\-LINKTOKEN is Blank, null, or empty in the header\.    

\[    

    \{    

        "key": "X\-LINK\-TOKEN",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

     

When X\-LINK\-   

TOKEN is Invalid in the header\.    

\[    

    \{    

        "key": "X\-LINK\-TOKEN",    

        "value": "hghhjjkhjkbkjbjkbkjbnkjbk   

",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1066: ",    

    "message": "Invalid JWT token"    

\}    

Code \- 400Bad Request    

    

    

    

    

    

When the HIP ID is not matching with   

Link Token in    

Header    

\[    

    \{    

        "key": "X\-HIP\-ID",    

        "value": "XYZ",    

        "type": "text"    

    \},    

    \{    

        "key": "X\-LINK\-TOKEN",    

        "value": "eyJhbGciOiJSUzUYr9LtA5  A",    

        "type": "text"    

    \}    

\{    

    "code": "ABDM\-1063",    

    "message": "HIP Id mismatch with   Link token"    

\}    

     

Code \- 400Bad Request    

    

   

   

\]    

    

When passing the Link Token of another user in the header    

\[    

    \{    

        "key": "X\-LINK\-TOKEN",    

        "value": "eyJhbGciOiJSUzUxMiJ9\.ey JoaXBJZCI6IlN1YzTlcJDFRfSAhPZxRpAr mlevBdVt4rLk\-   

EkCRGfLmFqizijYO7z\_pdasi35fG6dknrNDQb1vf\- 0o0ggQHOyjhD2aJLBDGjSKsAOidU9qS usEjBC6j4HU3uZjyFPMQjg",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1038",    

    "message": "ABHA address misma tch with 

Link token"    

\}    

Code : 400Bad Request    

    

    

    

    

    

 Request body missing    

     

\{    

    "code": "ABDM\-1064",    

    "message": "Request body was mi ssing"    

\}    

Code : 400Bad Request    

    

Duplicate HIP Link request    

\{    

    "abhaNumber": "91178386101731",        "abhaAddress": "91178386101731@sbx"   

,    

    "patient": \[    

        \{    

            "referenceNumber": "Mayur C",    

            "display": "Apollo\_Encounter\_123   

\_2023070414",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "Health    

Document Reference Number",    

                    "display": "Sugar Test"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \]   \}        

\{    

    "code": "ABDM\-1090",    

    "message": "Duplicate HIP link req uest"    

\}     

When Abha Number  is mismatch with    

Link Token    

\{    

    "abhaNumber": "11111111111111",       "abhaAddress": "91178386101731@sbx"   

,    

    "patient": \[    

        \{    

            "referenceNumber": "Mayur C",    

\{    

    "code": "ABDM\-1062",    

    "message": "ABHA number misma tch 

with Link token"    

\}     

   

   

            "display": "Apollo\_Encounter\_123   

\_2023070414",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "Health    

Document Reference Number",    

                    "display": "Sugar Test"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \]   \}    

    

   

  

 

When Abha Number  is mismatch with    

Link Token    

\{    

    "abhaNumber": "91178386101731",    

    "abhaAddress": "11111111111111@sbx",    

    "patient": \[    

        \{    

            "referenceNumber": "Mayur C",    

            "display": "Apollo\_Encounter\_123   

\_2023070414",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "Health    

Document Reference Number",    

                    "display": "Sugar Test"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \]    

\}     

\{    

    "code": "ABDM\-1038",    

    "message": "ABHA address misma tch with 

Link token"    

\}      

Code \- 400Bad Request    

If care context is null    

\{    

    "abhaNumber": "91178386101731",        "abhaAddress": "91178386101731@sbx"   

,    

    "patient": \[    

        \{    

            "referenceNumber": "Mayur C",    

            "display": "Apollo\_Encounter\_123   

\_2023070414",    

            "careContexts": __null__,    

            "hiType": "PRESCRIPTION",    

            "count": 1    

\[    

    \{    

        "code": "ABDM\-9999: ",    

        "message": "careContexts attrib ute required in the payload"    

    \}   \]    

    

Code \- 400Bad Request    

     

   

        \}    

    \]   \}        

   

when passing invlalid HiType    

\{    

    "abhaNumber": "9117838610XXXX ",    

    "abhaAddress": "9117838610XXXX    

@sbx",    

    "patient": \[    

        \{    

            "referenceNumber": "Mayur C",    

            "display": "Apollo\_Encounter\_123   

\_2023070414",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "Health    

Document Reference Number",    

                    "display": "Sugar Test"    

                \}    

            \],    

            "hiType": "PRESCRsbjs",    

            "count": 1    

        \}    

    \]    

\}     

\[    

    \{    

        "code": "ABDM\-9999: ",    

        "message": "Invalid HIType, it m ust be in PRESCRIPTION, DIAGNOSTIC REPORT,   

OPCONSULTATION, DISCHAR   

GESUMMARY, IMMUNIZATIONRECORD,   

 HEALTHDOCUMENTRECORD, WELLNE   

SSRECORD"    

    \}   \]    

    

Code \- 400Bad Request    

     

If count is not matching with Care   

Context count    

\{    

    "abhaNumber": "91178386101731",        "abhaAddress": "91178386101731@sbx"   

,    

    "patient": \[    

        \{    

            "referenceNumber": "Mayur C",    

            "display": "Apollo\_Encounter\_123   

\_2023070414",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "Health    

Document Reference Number",    

                    "display": "Sugar Test"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 20    

        \}    

    \]    

\}     

Callback: \{    

    "abhaAddress": "91178386101731@s bx",  

    "error": \{    

        "code": "ABDM\-1037: ",           

"message": "Count and Care co ntext count mismatch"    

    \},    

    "response": \{    

        "requestId": "ab00fdec\-fc804502\-b1bc\-  

121be6808a9f"    

    \}   \}    

    

Code \- 202Accepted    

    

    

__ __   

### <a id="_Toc376276"></a>4\.3\.3 Linking care context    

This API needs to be called by the HIP to link the care context against the patient ABHA address, once the HIP has the valid linking token generated against the same patient ABHA address\.__ __   

__URL:__ /api/hiecm/hip/v3/link/carecontext  

__Request:__ POST   

__Header Parameters:__     

Property   

Name    

Example Value    

Require  

d    

Descriptio  

n    

REQUEST\-ID  

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

Yes    

Unique UUID for tracking the endto\-end request transaction\.   

TIMESTAMP  

2022\-10\-06T10:10:00\.587Z    

Yes    

The actual time when the request was   

initiated, ISO Date time format represents date and time\.    

Authorizati on    

eyJhbGciOiJSUzUxMiJ9\.eyJzdWIiOiJ2YXNhbnRo YWt1bWFyLmtlc2F2YW5Ac2J4IiwiY2xpZW50SW   

QiOiJzYngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJyZXF  1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJNb2JpbGUiO m51bGwsImV4cCI6MTY2NzI5ODExNSwiaWF0Ijo xNjY3MjkwOTE1LCJwaHJBZGRyZXNzIjoidmFzYW 50aGFrdW1hci5rZXNhdmFuQHNieCIsInR4bklkIjo   

iYjEwMGM4ZDMtNTE1ZC00YWFiLTg1OWQtYzNlM TUwOTE3ZGY1In0    

Yes    

JWT Access token which 

was issued    

by ABDM  session API after successful validation of client id and secret\.    

X\-HIP\-ID    

IN2810014366    

Yes    

Identifier of the health information provider to which the request was intended\.    

X\-CM\-ID    

sbx    

Yes    

Suffix of the  consent manager to which the request was intended\.    

X\-LINK\-  

TOKEN    

“eyJhbGciOiJSUzUxMiJ9\.eyJoaXBJZCI6Ik1BREhV  

UkFfREVNTyIsInN1YiI6InBhcmFnQHNieCIsImFiaG  FOdW1iZXIiOjcxMTYyODUwMTMzNjYzLCJleHAiOj E2OTA5MTIzMDEsImlhdCI6MTY3NTE0NDMwMS widHJhbnNhY3Rpb25JZCI6IjhjMjYyZTFhLTlhY2M tNDM1YS04OTY4LTVlODY1YjUzNjQwNSIsImFiaGF   

BZGRyZXNzIjoicGFyYWdAc2J4In0\.aNDRjI\-   

Yes    

Link token generated against   

patient  ABHA  address and/or ABHA number\.    

   

WKUecEX7BAM710B1aFkHfhB5nB\-  

ND4T3Lpm9kFCNJlj9BVLUaLZAMU0svscEMrPuZXONG1  

JalymEjhlCYvjBsFOSBUQ5CTFdoT4VDJC3P2u2X   

3Xhi5tepTZrgsYMafuhMRXvRfqSjn0kSLJQloAr5fi NQdBWWMGsYwcFLWLjo4MSwHC6AS9RMUfY3 

w4\_J4qy4zgqULBoedITc1tQHxDlIg7amvXXgYzn   

29Iam65cQG0sseRYf\_ceI5kq3mxn154Lpwzh\_lH\_VXOx0h9MDvLFf76TXgozce8\_Q8 SKEsyB1U pbes2vQ59qjQS4e9MHbtRHeyEeJ2IMmThYQ”    

   

   

__Body Parameters:__ __ __   

Property Name    

Example Value    

Required    

Description    

abhaAddress    

ABHA address    

Yes    

Patient ABHA address against which the health records need to be linked\. ABHA address is mandatory\.    

abhaNumber    

ABHA number    

No    

14\-digit unique ABHA number of the patient\.    

referenceNumber    

“TMH\-PUID\-001”    

Yes    

This should be a unique ID or number for each new response\.    

display    

“Display”    

Yes    

Displayed information about the care contexts    

careContexts    

"careContexts": \[    

  \{    

    "referenceNumber": "TMH\-PUID",    

    "display": "display 1"    

  \}   \]    

Yes    

Care  	context  is  	the  	patient individual health record\.    

hiType    

“PRESCRIPTION”    

Yes    

There are 7 different hiTypes in ABDM:    

Prescription    

DiagnosticReport    

OPConsultation    

DischargeSummary    

ImmunizationRecord    

HealthDocumentRecord    

WellnessRecord    

count    

1    

Yes    

Number of health records in the careContext object    

__Request Body:__      

Request Body    

\{    

    "abhaNumber": 9117838610XXXX,    

    "abhaAddress": "abc@abdm",    

    "patient": \[    	 

        \{    

            "referenceNumber": "TMH\-PUID\-001",    

            "display": "Display",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "TMH\-PUID\-001",    

                    "display": "display 1"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \] \}    

__ __   

__Response Body:__     

Response    

Code : 202 Accepted     

    

__Error scenarios: __   

    

__Scenario __   

__Headers/Body __   

__Message __   

When the Request ID is Blank, null, or empty in the  header    

\[\{"key":"REQUEST\-   

ID","value":"","type":"text"\}\]    

Access Denied     

Code : 403 Forbidden     

When an invalid Request ID is passed in the header     

\[\{"key":"REQUEST\-   

   

ID","value":"\{\{$guid\}\}zxzzxs"," type":"text"\}\]    

\{    

    "code": "ABDM\-1030: ",        "message": "Invalid request    

ID"    

\}        

     

Code: 400Bad Request     

When Timestamp is Blank, null, or empty in the header\.     

\[\{"key":"TIMESTAMP","value":"",   

"type":"text"\}\]    

Access Denied     

Code : 403 Forbidden     

When an invalid    

Timestamp is passed in the header 

 

\[\{"key":"TIMESTAMP","value":"\{   

\{$isoTimestamp\}\}jhgftytgty  

   

u","type":"text"\}\]    

 

\{    

    "code": "ABDM\-1016: ",    

    "message": "Invalid    

Timestamp"    

\}    

     

Code \- 400Bad Request    

   

   

Access Denied     

   

When X\-HIP\-ID is Blank, null, or empty in the header\.      

\[\{"key":"X\-HIP\-   

ID","value":"","type":"text"\}\]    

Code : 403 Forbidden     

When X\-CM\-ID is Invalid, Blank, null or empty in header\.     

\[\{"key":"X\-CM\-   

ID","value":"sbxdvdfvdf","type ":"text"\}\]    

Access Denied     

Code : 403 Forbidden     

When X\-LINK\-TOKEN is Blank, null or empty in header\.    

\[\{"key":"X\-LINK\-   

TOKEN","value":"","type":"text"\}   

\]    

Access Denied     

Code : 403 Forbidden    

     

When X\-LINK\-TOKEN is Invalid in header\.    

\[\{"key":"X\-LINK\-   

TOKEN","value":"hghhjjkhjkbkj bjkbkjbnkjbk","type":"text"\}\]    

\{    

    "code": "ABDM\-1066: ",    

    "message": "Invalid JWT token"    

\}    

     

Code \- 400Bad Request    

     

When HIP ID is not    

matching with Link Token in    

Header    

\[\{"key":"X\-HIP\-   

ID","value":"XYZ","type":"text"\},   

\{"key":"X\-LINK\-   

TOKEN","value":"eyJhbGciOiJ   

SUzUYr9LtA5A","type":"text"\}\]    

\{    

    "code": "ABDM\-1063",    

    "message": "HIP Id mismatch with   

Link token"    

\}    

     

Code \- 400Bad Request    

     

    

When passing Link Token of another user in header    

\[\{"key":"X\-LINK\-   

TOKEN","value":"eyJhbGciOiJ   

SUzUxMiJ9\.eyJoaXBJZCI6IlN1 Yl9ISVAiLCJzdWIiOiI5MTQxN DA3MTMyMTgyNUBhYmRtIi wiYWJoYU51bWJlciI6OTE0M TQwNzEzMjE4MjUsImV4cCI6 MTY5OTI5ODE2NCwiaWF0Ijo xNjgzNTMwMTY0LCJ0cmFuc   

2FjdGlvbklkIjoiZTI5YTA3ZDkt YTA0OC00N2NhLWI1MTUtNT kyMjMwMDk5NmVjIiwiYWJo YUFkZHJlc3MiOiI5MTQxNDA3   

MTMyMTgyNUBhYmRtIn0\.IZq   

QAtFNBnEav0nT4XSG3XDDX   

KDTljAMPYW\-I81EU9xkhi\- 

9xK6MrzTw5xlzaOasllcJDFRf   

SAhPZxRpArmlevBdVt4rLkEkCRGfLmFqizijYO7z\_pdasi3  

5\-fG6bV3DbCidO8ZM2zl\_wHi5vDXZbv3gJvjBQ4Hd0 Pz62WRJSbcRt62Dfcha3HYr1 gKcKZCkojDk94RGNYWevdH KYgr4lFdu\_EKuuykyFlk5VjBe oLFyivpqjiQmbPeRutE\_T7B9   

G4VveakeyAQosLHAG6dknrNDQb1vf\-   

0o0ggQHOyjhD2aJLBDGjSK   

sAOidU9qSusEjBC6j4HU3uZj yFPMQjg","type":"text"\}\]   

\{    

    "code": "ABDM\-1038",     "message": "ABHA address   

mismatch with Link token"    

\}    

     

      

Code : 400Bad Request    

     

 Request body missing    

     

 \{    

    "code": "ABDM\-1064",    

    "message": "Request body was missing"    

\}    

     

Code : 400Bad Request    

Duplicate HIP Link request    

\{    

    "abhaNumber": "9117838610XXXX ",     "abhaAddress":    

"9117838610XXXX @sbx",    

    "patient": \[    

        \{    

            "referenceNumber": "Mayur C",    

\{    

    "code": "ABDM\-1090",     "message": "Duplicate HIP link 

request"    

\}    

       

     

   

            "display":    

"Apollo\_Encounter\_123\_20230   

70414",    

            "careContexts": \[    

                \{    

                    "referenceNumber":    

"Health Document Reference   

Number",    

                    "display": "Sugar    

Test"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}        \]  \}    

     

     

     

     

     

     

     

     

     

     

     

     

     

     

 

When Abha Number is mismatch 

with Link Token    

\{    

    "abhaNumber": "11111111111111",  "abhaAddress":    

"91178386101731@sbx",    

    "patient": \[    

        \{    

            "referenceNumber":    "Mayur C",    

            "display":    

"Apollo\_Encounter\_123\_20230   

70414",    

            "careContexts": \[    

                \{    

                    "referenceNumber":    

"Health Document Reference    

Number",    

                    "display": "Sugar    

Test"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \]   \}    

\{    

    "code": "ABDM\-1062",      

"message": "ABHA number  mismatch  

with Link token"    

\}    

       

     

     

     

     

     

     

     

     

     

     

     

     

    

     

\{    

     

    

  

Empty patient details in the request    

\{    

    "abhaNumber": 12345678901   234,    

    "abhaAddress": "abc@abdm"   

,    

    "patient": \[\]   \}    

\{    

  "code": "ABDM\-1115",    "message": "Invalid patient information\. At least one patient 

information is required\."    

\}     

Trying to link a record for a deleted abha address    

\{    

    "abhaNumber": "91178386101731",  "abhaAddress":    

"91178386101731@sbx",    

    "patient": \[    

        \{    

            "referenceNumber":    

"Mayur C",    

            "display":    

"Apollo\_Encounter\_123\_20230   

70414",    

            "careContexts": \[    

                \{    

                    "referenceNumber":    

"Health Document Reference    

Number",    

                    "display": "Sugar    

Test"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \]   \}    

\{    

  "code": "ABDM\-1031",   "message":   

"The abha  address is  deactivated\."    

\}    

    

    

### <a id="_Toc376277"></a>4\.3\.4 Call back API for linking care context with patient ABHA address    

    

This is a callback API triggered by HIE\-CM to notify HIP/HRP about linked care context response\.    

__URL:__ \{callback\_url\}/api/v3/link/on\_carecontext    

__Request:__ POST    

__Header Parameters:__     

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8    

Yes    

Unique UUID for tracking the end\-toend request transaction__\. __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

The actual time when the request was initiated, ISO 8601 represents the date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds, and milliseconds__\.__    

X\-HIP\-ID    

IN2810014366    

Yes    

Identifier of the health information provider to which the request was intended\.    

Authorization    

eyJhbGciOiJSUzUxMiJ9\.   

eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2    

YW5Ac2J4IiwiY2xpZW50SWQiOiJz    

YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL    

CJwaHJNb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwia    

WF0IjoxNjY3MjkwOTE1LCJwaHJBZ    

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX    

NhdmFuQHNieCIsInR4bklkIjoi    

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O    

WQtYzNlMTUwOTE3ZGY1In0    

Yes    

JWT Access token which was issued by ABDM session API after successful validation of client id and secret    

  

__ __   

__Body Parameters:__ __ __   

Property    

Name    

Example Value    

Required    

Description    

abhaAddress    

"abc@abdm"    

Yes    

Patient ABHA address against which the  health records need to be linked    

status    

"Successfully Linked care context"    

Yes    

Status message in various scenarios:  "Successfully Linked care context" “Counter and Care context count mismatch”  “ABHA address and Link token mismatch”    

“Dependent service unavailable” “These care contexts have been already linked"    

requestId    

“f29f0e59\-8388\-   

4698\-9fe605db67aeac46”    

Yes    

Unique UUID for tracking the endto\-end request transaction\.    

__Request Body:__     

Request Body    

\{    

    "abhaAddress": "abc@sbx",    

    "status": "Successfully Linked care context",    

    "response": \{    

        "requestId": "f29f0e59\-8388\-4698\-9fe6\-05db67aeac46"    

    \}    

\}    

__Error Scenario: __   

\{    

    "error": \{    

        "code": "ABDM\-1056",    

        "message": "This care context has been already linked"    

    \},    

    "response": \{    

        "requestId": "5ad6e060\-ea35\-4765\-8c8c\-cd7db8cb1a6f"    

    \}\}    

__Response Body:__     

Response    

Code : 202 Accepted     

    

[image removed - see original document]    

    

Call back HIU    

All the HIUs who are subscribed will be notified about the linkage of care contexts\.    

    

### <a id="_Toc376278"></a>4\.3\.5 Get all patient links    

    

This is the PHR APP API, this api will used to fetch all link care\-context for a patient\. 

__URL: __/api/hiecm/hip/v3/link/patient/links   

__Request: __GET  

__Header Parameters: __    

Property    

Name    

Example Value    

Required    

  

Description    

  

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2     

YW5Ac2J4IiwiY2xpZW50SWQiOiJzYngi   

LCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJ  

Nb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mj kwOTE1LCJwaHJBZ     

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZ   

XNhdmFuQHNieCIsInR4bklkIjoi     

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1OW   

QtYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endtoend request transaction    

TIMESTAMP     

2023  \-03\-09T07:07:41\.793Z    

Yes     

The actual time when the request was  initiated, ISO Date time format represents the date and time    

X\-AUTH\-TOKEN    

eyJhbGciOiJSUzUxMiJ9\.eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2    

    

JWT Authentication token which was issued by ABDM after successful validation of username and password    

X\-CM\-ID     

sbx     

Yes     

Suffix of the consent manager to which the request was intended     

    

__Request Params: __   

__ __   

Property Name   

    

Example Value    

Description    

limit    

    

100    

   

Number of records to be fetched from the database\.     

__Error scenarios: __   

    

Scenarios    

Headers/Body    

Message    

To verify when   Request ID is Blank, null or empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

   

\[    

\{    

To  	verify  	when 

invalid RequestID is pass in header     

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}   \]    

    "code": "ABDM\-1030: ",       "message": "Invalid reque st ID"    

\}    

     

 Code: 400Bad Request     

    

When    

Timestamp is   Blank, null or empty in header\.     

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "",           

"type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

    

When  	invalid

Timestamp is pass  in header    

 \[    

    \{    

        "key": "TIMESTAMP",    

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1016: ",     "message": "Invalid Times tamp"    

\}    

     

Code \- 400Bad Request    

    

    

Access Denied     

Code : 403 Forbidden     

    

When X\-CM\-ID    

\[    

Access Denied     

Code : 403 Forbidden     

is Invalid, Blank, null or empty in header\.    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"    

    \}    

\]     

When X\-Auth\-   

TOKEN is Invalid in header\.    

\[    

    \{    

        "key": "X\-AUTH\-TOKEN",    

        "value": "hghhjjkhjkbkjbjkbkjbnkjbk",    

        "type": "text"    

    \}   \]    

\{    

    ""code"": ""ABDM\-1065: "",    

    ""message"": "" Invalid X    

Auth token""    

\}    

    

Code \- 400Bad Request"    

__ __   

__ __   

__Response Body:__     

Response    

\{    

    "patient": \{    

        "id": "user\_1992@sbx",    

        "links": \[    

            \{    

                "hip": \{    

                    "id": "TestClinicHIP",    

                    "name": "TestClinicHIP",    

                    "type": "HIP"                    \},    

                "referenceNumber": "user\_1992@sbx",    

                "display": "User Record",    

                "hiType": "HealthDocumentRecord",    

                "careContexts": \[    

                    \{    

                        "referenceNumber": "e707c945\-3672\-4b85\-8525\-4c7e620ef301",    

                        "display": "Visited on 08\-Feb\-2024 09:00:00 Visit Type as Out Patient"    

                    \}    

                \],    

                "dateCreated": "2024\-07\-18T11:49:15\.736Z"    

            \}    

        \]    

    \}    

\}    

__ __ __ __ 

__ __   

### <a id="_Toc376279"></a>4\.3\.6 Notify care context update    

    

This API will be invoked by HIP after updating a health record to notify all the subscribed HIUs\.    

__URL: __/api/hiecm/hip/v3/link/context/notify   

__Request: __POST  __ __   

__Header Parameters: __    

Property    

Name    

Example Value    

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2     

YW5Ac2J4IiwiY2xpZW50SWQiOiJzYngi   

LCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJ  

Nb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mj kwOTE1LCJwaHJBZ     

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZ   

XNhdmFuQHNieCIsInR4bklkIjoi     

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1OW   

QtYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endtoend request transaction     

TIMESTAMP     

2023  \-03\-09T07:07:41\.793Z    

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-HIP\-ID    

IN2810014366    

    

Identifier of the health information provider to which the request was intended    

X\-CM\-ID     

sbx     

Yes     

Suffix of the consent manager to which the request was intended     

__Body Parameters: __   

Property Name   

    	Example Value    

Required    

Description    

Patient    

“patient” : \{    

    “id”: “user123@sbx”    

\}    

Yes     

The abha address of the patient whose record was updated\.    

careContext    

"careContext": \{    

      "patientReference":  "batman@tmh",    

      "careContextReference":    

"Episode1"    

    \}    

Yes     

Updated health record of the patient\.    

hiTypes    

"hiTypes": \[    

      "OPConsultation"    

    \]    

Yes    

There are 7 different hiTypes in ABDM:    

Prescription    

DiagnosticReport    

OPConsultation    

DischargeSummary    

ImmunizationRecord    

HealthDocumentRecord    

WellnessRecord    

Date    

“2024\-05\-30T05:21:34\.155Z”    

Yes    

The UTC time when the request was initiated, ISO Date time format represents the date and time\.    

Hip    

"hip": \{    

      "id": "demo\-hip\-261222"    

    \}    

Yes    

Identifier of the health information provider\.    

__ __   

__Request Body: __   

__ __   

Request Body:    

\{    

  "notification": \{    

    "patient": \{    

      "id": "user\_122@sbx"    

    \},    

    "careContext": \{    

      "patientReference": "batman@tmh",    

      "careContextReference": "Episode1"    

    \},    

    "hiTypes": \[    

      "OPConsultation"    

    \],    

    "date": "2024\-05\-30T05:21:34\.155Z",    

    "hip": \{    

      "id": "demo\-hip\-261222"    

    \}    \} \}    

    

  

__ __   

__Error scenarios: __   

    

Scenarios    

Headers/Body    

Message    

To verify when   Request ID is Blank, null or empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

To  	verify  	when 

invalid RequestID is pass in header     

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1030: ",       "message": "Invalid requ est ID"   

\}    

     

 Code: 400Bad Request     

    

When   Timestamp is   Blank, null or empty in header\.     

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

    

When  	invalid

Timestamp is pass  in header    

 \[    

    \{    

        "key": "TIMESTAMP",    

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1016: ",     "message": "Invalid Time stamp"    

\}    

     

Code \- 400Bad Request    

    

    

Access Denied     

Code : 403 Forbidden     

    

When X\-CM\-ID    

is Invalid, Blank, null or empty in header\.    

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

Access Denied     

Code : 403 Forbidden     

        "type": "text"    

    \}    

\]     

When X\-HIP\-ID is empty or Invalid in header\.    

\[    

    \{    

        "key": " X\-HIP\-ID",    

        "value": "",    

        "type": "text"    

    \}    

Access Denied     

Code : 403 Forbidden    

   

\]    

   

When given XHIP\-ID does not exist\.    

    

\{    

    "code": "ABDM\-1035: ",    

    "message": "Invalid HIP    

ID"    \}    

    

__Response Body:__     

Response    

Code : 202 Accepted     

    

Call back HIU    

__ __   

All the HIUs who are subscribed will be notified about the linkage of care contexts\.    

    

### <a id="_Toc376280"></a>4\.3\.7 Call back API for notify care context update    

This is a callback API triggered by HIE\-CM to notify HIP/HRP about care context update response\.    

__URL: __\{callbackURL\}/api/v3/links/context/on\-notify  __Request: __POST   __Header Parameters: __    

Property    

Name    

Example Value    

Required    

  

Description    

  

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2     

YW5Ac2J4IiwiY2xpZW50SWQiOiJzYngi   

LCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJ  

Nb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mj kwOTE1LCJwaHJBZ     

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZ   

XNhdmFuQHNieCIsInR4bklkIjoi     

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1OW   

QtYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endto\-end request transaction     

TIMESTAMP     

2023  \-03\-09T07:07:41\.793Z    

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-HIP\-ID    

IN2810014366    

    

Identifier of the health information provider to which the request was intended    

__Body Parameters: __   

Property Name    

Example Value    

Required    

Description    

requestId    

    

18235d89\-cb13\- 

479dad717a57d5f669a8     

    

Yes     

Unique UUID for tracking the end\-toend request transaction     

timestamp    

    

2023  \-03\-09T07:07:41\.793Z    

Yes     

The actual UTC time when the request was initiated, ISO Date time format represents the date and time    

error    

    

"error": \{    

    "code": "ABDM\-1024",    

    "message": "Dependent service unavailable"    

  \}    

No    

The error code and message if the notify request is failed\.    

response    

    

“response“: \{    

  “requestId”: “18235d89\-cb13\-  479d\-ad71\-7a57d5f6656a”    

\}    

Yes    

requestId from the    

/api/hiecm/hip/v3/link/context/notify API call 

acknowledgement   

    

 " acknowledgement": \{    

      “status": “SUCCESS"    

    \}    

Yes    

Status of the    

/api/hiecm/hip/v3/link/context/notify API call\.    

    

Request Body:    

  

\{    

  "requestId": "743ec386\-670f\-43a8\-a3ed\-44aa30fb15fb",    

  "timestamp": "2024\-05\-09T10:34:00\.387Z",    

  "acknowledgement": \{    

    "status": "SUCCESS"    

  \},    

  "response": \{    

    "requestId": "6f0b4665\-a915\-4c92\-aa36\-65afb4a2cd71"    

  \}    

\}    

__Response Body:__     

Response    

Code : 202 Accepted     

__ __   

[image removed - see original document]__ __   

__ __   

### <a id="_Toc376281"></a>4\.3\.8 SMS Notification to patients    

    

This API will be invoked by HIP to trigger a SMS notification to the patient mobile number when health record is available to fetch\.    

    

__URL: __/api/hiecm/hip/v3/link/patient/links/sms/notify2  

 __Request: __POST    

__Header Parameters: __    

Property    

Name    

Example Value    

Required    

  

Description    

 

  

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2     

YW5Ac2J4IiwiY2xpZW50SWQiOiJzYngi   

LCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJ  Nb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mj kwOTE1LCJwaHJBZ     

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZ   

XNhdmFuQHNieCIsInR4bklkIjoi     

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1OW   

QtYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endtoend request transaction    

TIMESTAMP     

2023  \-03\-09T07:07:41\.793Z    

Yes     

The actual time when the request was  initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

sbx     

Yes     

Suffix of the consent manager to which the request was intended     

__Body Parameters: __   

Property Name   

    	Example Value    

Required    

Description    

requestId    

    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

The id will be unique value to identify each notification requests\.    

phoneNo    

9876543210    

Yes     

Mobile number of the patient\.    

hip    

    

"hip": \{    

            "name": "HIP Name",    

            "id": "TestClinicHIP"    

        \}    

    

Yes    

Identifier and name of the health information provider\.    

__ __   

__ __   

__Request Body: __   

__ __   

Request Body:    

\{    

  "requestId": "743ec386\-670f\-43a8\-a3ed\-44aa30fb15fb",    

  "timestamp": "2024\-05\-09T10:34:00\.387Z",    

  "notification": \{    

    "phoneNo": "986543210",    

    "hip": \{    

      "id": "ABDM\_HIP",    

      "name": "ABC Hospital"    

    \}    

  \}    \}    

__ __   

__Error scenarios: __   

    

Scenarios    

Headers/Body    

Message    

To verify when  Request ID is Blank,  null or    

\[    

    \{    

        "key": "REQUEST\-ID",    

Access Denied     

Code : 403 Forbidden     

    

    

empty in     

    

header    

        "value": "",    

        "type": "text"    

    \}   \]    

To  	verify  	when 

invalid RequestID is pass in header     

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1030: ",       "message": "Invalid requ est ID"   

\}    

     

 Code: 400Bad Request     

    

When    

Timestamp is   

Blank, null or empty in header\.     

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

    

When invalid  Timestamp is pass in header    

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1016: ",      "message": "Invalid Time stamp"  

\}    

     

Code \- 400Bad Request    

    

    

   

   

Access Denied     

Code : 403 Forbidden     

    

When X\-CM\-ID    

is Invalid, Blank, null or empty in header\.    

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"    

    \}    

\]     

Access Denied     

Code : 403 Forbidden     

When given HIP id does not exist\.    

    

\{    

    "code": "ABDM\-1035: ",        "message": "Invalid HIP    

ID"    \}    

    

__Response Body:__     

Response    

Code : 202 Accepted     

__ __   

### <a id="_Toc376282"></a>4\.3\.9 Callback API for SMS Notification to patients    

    

This is a callback API triggered by HIE\-CM to notify HIP/HRP about SMS notification response\.  __URL: __\{callbackURL\}/api/v3/patients/sms/on\-notify   

__Request: __POST   __Header Parameters: __    

Property    

Name    

Example Value    

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2     

YW5Ac2J4IiwiY2xpZW50SWQiOiJzYngi   

LCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJ  

Nb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mj kwOTE1LCJwaHJBZ     

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZ   

XNhdmFuQHNieCIsInR4bklkIjoi     

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1OW   

QtYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endto\-end request transaction     

TIMESTAMP     

2023  \-03\-09T07:07:41\.793Z    

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-HIP\-ID    

IN2810014366    

Yes    

Identifier of the health information provider to which the request was intended    

__Body Parameters: __   

Property    

Name    

Example Value    

Required    

Description    

 

 

  

  

requestId    

    

18235d89\-cb13\- 

479dad717a57d5f669a8     

    

Yes     

Unique UUID for tracking the end\-to\-end request transaction     

timestamp    

    

2023    	\-03\-09T07:07:41\.793Z

 Yes     

The actual UTC time when the request was initiated, ISO Date time format represents the date and time    

status    

“status": “SUCCESS"    

Yes    

Status of the    

/hiecm/api/v3/link/patient/links/sms/notify2  

API call\.    

error    

    

"error": \{    

    "code": "ABDM\-1024",    

    "message": "Dependent service unavailable"    

  \}    

No    

The error code and message if the notify request is failed\.    

resp    

    

“resp“: \{    

  “requestId”: “18235d89cb13\-  

479d\-ad717a57d5f6656a”    

\}    

Yes    

requestId from the    

/hiecm/api/v3/link/patient/links/sms/notify2  

API call\.    

__ __   

__Request Body: __   

__ __   

Request Body:    

  

\{    

  "requestId": "743ec386\-670f\-43a8\-a3ed\-44aa30fb15fb",    

  "timestamp": "2024\-05\-09T10:34:00\.387Z",    

  "status": "SUCCESS",    

  "error": \{    

    "code": "ABDM\-1024",    

    "message": "Dependent service unavailable"    

  \},    

  "resp": \{    

    "requestId": "6f0b4665\-a915\-4c92\-aa36\-65afb4a2cd71"    

  \}   \}    

__ __   

__Response Body:__     

Response    

Code : 202 Accepted     

    

[image removed - see original document]    

    

# <a id="_Toc376283"></a>              5\.User Initiated Linking    

## <a id="_Toc376284"></a>5\.1 Overview    

    

User\-initiated linking is the process in which Users/Patient search for their health records from ABDM\-compliant health facilities\. Once health records are found, users can link their health records with their ABHA address\.    

    

The user must have a Patient HIU \(PHR App in the current scenario\) via which the user can start the discovery of health records and link the health records for future reference\.    

     

__Following are the steps involved in User initiated linking __   

- User searches for a health facility that they have visited in the past\.     
- The health facility must be a HIP \(part of the facility registry\) and linked with an HRP for discovery to be supported     
- User makes a discovery request via Patient HIU \(PHR App\) – i\.e\., requests the HIP to find any health records in their name     
- User shares his/her details through their PHR address\. Details shared\- Name, Date of birth, Gender, verified mobile no\. with the HIP / HRP     
- The HRP/HIP is expected to search its database for any records that match this patient\.     
- If there is a match, the HRP/HIP returns with the Care Context details for the records available     
- If there is no match, the HRP/HIP returns an error     
- The User can now request to link the records \(care contexts\) with their PHR address     
- The HRP/HIP will perform the validation by sending an OTP to the registered mobile\.    
- If the authentication succeeds, the care contexts are linked to the PHR address    

    

    

    

## <a id="_Toc376285"></a>5\.2 Sequence Diagram    

    

[image removed - see original document]    

    

[image removed - see original document]    

    

[image removed - see original document]    

    	  

  

  

  

## <a id="_Toc376286"></a>5\.3List of APIs      

### <a id="_Toc376287"></a>5\.3\.1 Patient Health record discovery    

This API will be invoked by the patient/user from the PHR application to HIECM to discover his/her health records\.    

__URL:__ /api/hiecm/user\-initiated\-linking/v3/patient/care\-context/discover  __Request:__ POST   __Header Parameters: __    

Property    

Name    

Example Value    

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2     

YW5Ac2J4IiwiY2xpZW50SWQiOiJzYngi   

LCJzeXN0ZW0iOiJBQkhBLUEiLCJy     

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJ  Nb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mj kwOTE1LCJwaHJBZ     

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZ   

XNhdmFuQHNieCIsInR4bklkIjoi     

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1OW   

QtYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the end\-toend request transaction    

TIMESTAMP     

2023  \-03\-09T07:07:41\.793Z    

Yes     

The actual time when the request was  initiated, ISO Date time format represents the date and time    

X\-AUTH\-TOKEN    

eyJhbGciOiJSUzUxMiJ9\.eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2    

    

JWT Authentication token which was issued by ABDM after    

successful validation of username and password    

X\-CM\-ID     

sbx     

Yes     

Suffix of the consent manager to which the request was intended     

X\-HIU\-ID     

HIU\_ID    

Yes     

Identifier of the health information user to which the request was intended    

__ __   

__Body Parameters: __   

Property Name    

Example Value    

Required    

Description    

 

 

 

hipId     

ABDM\_HIP    

Yes     

Identifier of the health information provider to which the request was intended 

unverifiedIdentifiers   

\{    

    "type": "ABHA\_ADDRESS",    

    "value": "shaik\.XXXX@sbx"    

\}    

Yes     

Identifiers using which the HIP will search the patient information in their records\.    

__ __   

__Request Body: __   

__ __   

Request Body    

\{    

    "hipId": "ABDM\_HIP",    

    "unverifiedIdentifiers": \[    

        \{    

            "type": "ABHA\_ADDRESS",               

"value": "shaik\.XXXX@sbx"    

        \}     \]    

\}    

    

__Response Body:__     

Response    

Code: 202 Accepted    

    

    

__Error scenarios: __   

    

Scenarios    

Headers/Body    

Message    

To verify when   Request ID is Blank, null or empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

To  	verify  	when 

invalid RequestID is pass in header     

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1030: ",       "message": "Invalid reque st ID"    

\}    

     

 Code: 400Bad Request     

    

 

 

   

When   Timestamp is   Blank, null or empty in header\.     

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

    

    

When invalid  Timestamp is pass in header    

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1016: ",     "message": "Invalid Times tamp"    

\}    

     

Code \- 400Bad Request    

    

    

When X\-HIP\-ID  is Blank, null or empty in header\.      

\[    

    \{    

        "key": "X\-HIP\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

    

Access Denied     

Code : 403 Forbidden     

    

When X\-CM\-ID    

is Invalid, Blank, null or empty in header\.    

  

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

Access Denied     

Code : 403 Forbidden     

        "type": "text"    

  

    \}    

\]     

When X\-Auth\-   

TOKEN is Invalid in header\.    

\[    

    \{    

        "key": "X\-LINK\-TOKEN",    

        "value": "hghhjjkhjkbkjbjkbkjbnkjbk",    

        "type": "text"    

    \}   \]    

\{    

    ""code"": ""ABDM\-1066: "",     ""message"": ""Invalid JWT token""    

\}    

    

Code \- 400Bad Request"    

Verify when HIP is null, blank or  invalid in the body     

\{    

    "hip": \{    

        "id": ""    

    \},    

    "unverifiedIdentifiers": \[    

        \{    

            "type": "MR",    

            "value": "69128688344"    

        \}    

    \]   \}    

\{    

    "code": "ABDM\-9999: ",      

"message": "HIP ID is mandatory"   

\}     

When X\-HIU\-ID and the hipId in the payload is same\.    

    

    

\{    

    ""code"": ""ABDM\-1031    

: "",    

    ""message"": HIP and HIU  cannot be same""    

\}    

    

Code \- 400Bad Request"    

When  	duplicate request payload is sent\.    

    

    

\{    

    "code": "ABDM\-1103: ",    

    ""message"": “Duplicate   Discovery request“    

\}    

    

Code \- 400Bad Request"    

    

### <a id="_Toc376288"></a>5\.3\.2 HIE\-CM callback to HIP \- Discovery    

This is a callback API invoked by HIE\-CM to let the HIP know about the discovery request raised by the patient using HIE\-CM’s discovery\.    

__URL:__ \{callback\_url\}/api/v3/hip/patient/care\-context/discover    

__Request:__ POST    

__Header Parameters:__    

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8     

Yes     

Unique UUID for tracking the endto\-end request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-HIP\-ID     

HIP\_ID    

Yes     

Identifier of the health information provided to which the request was intended    

__ __   

[image removed - see original document]  

\{    

    "transactionId": "03813343\-ebc5\-4c9f\-89b6\-6e9a75fd7c92",    

    "patient": \{    

        "id": "9167@sbx",    

        "verifiedIdentifiers": \[    

            \{    

                "type": "MOBILE",    

                "value": "987654XXXX"    

            \},    

            \{    

                "type": "ABHA\_NUMBER",    

                "value": "916248419XXXX"    

            \}    

        \],    

        "unverifiedIdentifiers": \[    

            \{    

                "type": "MR",    

                "value": "987654XXXX"    

            \}    

        \],    

        "name": "User 1",    

        "gender": "M",    

        "yearOfBirth": XXXX    

    \}    \}    

    

Response   

Code: 200 OK   

    

[image removed - see original document]    

    

    

### <a id="_Toc376289"></a>5\.3\.3 HMIS/LMIS response on health record discover    

    

This API will be invoked by the __HMIS/LIMS application__ for sharing the response of discover request\.    

__URL:__ /api/hiecm/user\-initiated\-linking/v3/patient/care\-context/on\-discover    

__Request:__ POST  __ __   

__Header Parameters: __    

Property    

Name    

Example Value    

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac2J4IiwiY2xpZW50SWQiOi  JzYngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJyZXF1ZXN0Z XJJZCI6IlBIUi1XRUIiLCJwaHJNb2JpbGUiOm51bGw sImV4cCI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mjkw OTE1LCJwaHJBZGRyZXNzIjoidmFzYW50aGFrdW1h ci5rZXNhdmFuQHNieCIsInR4bklkIjoiYjEwMGM4ZD MtNTE1ZC00YWFiLTg1OWQtYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8     

Yes     

Unique UUID for tracking the end\-toend request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

sbx     

Yes     

Suffix of the consent manager to which the request was intended     

__Body Parameters:  __   

Property    

Name    

Example Value    

Required    

Description    

  

transactionId    

f901b782\-bfdf\-4224\-   

9f8d\-da2cadc20c0d    

Yes    

Transaction Id is required to identify the unique transaction for user\-initiated care context linking\.   

This chains all the steps to link care contexts\. Transaction Id will be returned after a successful discovery request to HIP by the patient\.    

patient     

\-    

Optional    

A list of records of the patient that were found as a result of the identifiers that the patient had provided\.    

referenceNumber   

 example01    

Yes    

Reference number of the patient details    

careContexts    

\-    

Yes    

List of care contexts linked at the HIP end for the identified patient\.    

hiType    

PRESCRIPTION    

Yes    

HiType of the patient details    

count    

1    

Yes    

The count of care contexts that are found for the patient in scope    

requestId    

2c17a46b\-d28e\- 

4a60a7cffe77163ae93c    

Yes    

Request ID sent by the patient in the discovery API call\. This request ID will be used to match the flow of linking care contexts for a patient    

Error    

\{    

"code": "ABDM\-1010", "message": "Patient not 

found"    

\}    

Optional    

The error should be included if no details are found for the patient at HIP for the  given patient identifiers\. The error should contain ABDM standard code and message to indicate the reason properly\.    

matchedBy    

MR     

Yes    

How the records are matched    

__ __   

  

  	Request Body    

__Success Scenario: __     	  

\{    

    "transactionId": "66446ece\-396b\-4f22\-a1a6\-756196fdffc9",    

    "patient": \[    

        \{    

            "referenceNumber": "example01",    

            "display": "abcd\-display",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "abcd",    

                    "display": "123\-display"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \],    

    "matchedBy": \[    

        "MR"    

    \],    

    "response": \{    

        "requestId": "2c17a46b\-d28e\-4a60\-a7cf\-fe77163ae93c"    

    \}   \}    

__Failure Scenario: __   

\{    

    "transactionId": "66446ece\-396b\-4f22\-a1a6\-756196fdffc9",    

    "error": \{    

        "code": "ABDM\-1010",    

        "message": "Patient not found"    

    \},    

    "response": \{    

        "requestId": "2c17a46b\-d28e\-4a60\-a7cf\-fe77163ae93c"    

    \}   \}__ __   

__ __   

__Response: __    

__ __   

Response    

Code: 202 Accepted    

__Error Scenarios: __   

__ __   

__Scenarios __   

__Headers/Body __   

__Message __   

To verify when Request ID is Blank, null or empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied    

Code : 403 Forbidden    

To verify when invalid    

Request\-ID is pass in header     

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1030: ",    

    "message": "Invalid request I  D"    

\}    

Code:     400Bad Request     

When Timestamp is Blank, null or empty in header\.     

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "",           

"type": "text"    

    \}   \]    

Access Denied    

Code    : 403 Forbidden     

When invalid Timestamp is pass in header    

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "*\{\{$isoTimestamp\}*   

*\}*jhgftytgtyu",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1016: ",       "message": "Invalid Timesta mp"    

\}    

Code    	 \- 400Bad Request    

When X\-CM\-ID is Invalid, Blank, null or empty in header\.     

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"    

    \}   \]    

Access Denied    

Code    : 403 Forbidden     

   

Verify when transaction id is invalid, null or blank     

"transactionId": "776a9becab12\-  

42bc\-9ae9c63b1ae5bce2",    

"patient": \[    

    \{    

        "referenceNumber": "ST1",    

        "display": "",    

        "careContexts": \[    

            \{    

                "referenceNumber": "S  T2",   

                "display": "ST2"    

            \}    

        \],    

        "hiType": "PRESCRIPTION",    

        "count": 1    

    \}    

\],    

"matchedBy": \[    

    "MR"    

\],    

"response": \{    

    "requestId": "6f37ddf8\-62df\-   

4 afe\-bc25\-599789c90558"    

 

"code": "ABDM\-9999: ",    

"message": "Invalid Transactio n ID /  Transaction expired\."    

Verify message when HI types is passed as incorrect     

"transactionId": "776a9becab12\-  

42bc\-9ae9c63b1ae5bce2",    

"patient": \[    

    \{    

        "referenceNumber": "ST1",    

        "display": "",    

        "careContexts": \[    

            \{    

                "referenceNumber": "S  T2",   

                "display": "ST2"    

            \}    

        \],    

        "hiType": "PRESCRIPTION",    

        "count": 1    

    \}    

\],    

"matchedBy": \[    

    "MR"    

\],    

"response": \{    

    "requestId": "6f37ddf8\- 

62df4afebc25\-599789c90558"    

    

\{    

    "code": "ABDM\-9999: ",    

    "message": "Invalid HIType, it must   be in PRESCRIPTION, DIAGNOSTI   

CREPORT,     

OPCONSULTATION, DISCHARGES   

UMMARY,    

 IMMUNIZATIONRECORD, HEALTH   

 DOCUMENTRECORD, WELLNESSR   

ECORD"    

\}    

400 Bad Request    

     

   

Verify message when careconexts is blank, null    

"transactionId": "776a9becab12\-  

42bc\-9ae9c63b1ae5bce2",    

"patient": \[    

    \{    

        "referenceNumber": "ST1",    

        "display": "",    

        "careContexts": \[    

            \{    

                "referenceNumber": "S  T2",   

                "display": "ST2"    

            \}    

        \],    

        "hiType": "PRESCRIPTION",    

        "count": 1    

    \}    

\],    

"matchedBy": \[    

    "MR"    

\],    

"response": \{    

    "requestId": "6f37ddf8\-62df\-   

4  afe\-bc25\-599789c90558"    

\{    

    "code": "ABDM\-9999: ",    

    "message": "Invalid Care     

Contexts count, must range be tween   

1  to 20"    

\}    

    

 

Verify if the requestId is a valid id from the discovery request\.    

   

\{    

    "code": "ABDM\-1015: ",    

    "message": "Invalid   

Response"    

\}    

    

Verify if it is a duplicate request     

   

\{    

    "code": "ABDM\-1106: ",     "message": "Duplicate On discovery request"    

\}    

Code: 400Bad Request    

Verify if the count and the no of care contexts matches in the payload\.    

"transactionId": "776a9becab12\-  

42bc\-9ae9c63b1ae5bce2",    

"patient": \[    

    \{    

        "referenceNumber": "ST1",    

        "display": "",    

        "careContexts": \[    

            \{    

                "referenceNumber": "S  T2",    

                "display": "ST2"    

            \}    

        \],    

        "hiType": "PRESCRIPTION",    

        "count": 2    

    \}    

\],    

"matchedBy": \[    

    "MR"    

\],    

"response": \{    

    "requestId": "6f37ddf8\- 

62df4afebc25\-599789c90558"    

    

\{    

    "code": "ABDM\-1059: ",    

    "message": "Invalid Care   

Contexts count"    

\}    

    

__ __   

    	    

### <a id="_Toc376290"></a>5\.3\.4 HIE\-CM callback on Health record discover    

This API will be invoked by the __HIE\-CM__ for sharing the response of health record discover\.    

    

__URL:__ \{callback\_url\}/api/v3/hiu/patient/care\-context/on\-discover   __Request:__ POST    

__Header Parameters: __    

Property Name    

Example Value    

Required    

Description    

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endto\-end request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

sbx   

Yes     

Identifier of the health information user to which the request was intended    

__Body Parameters:  __   

Property Name    

Example Value    

Required    

Description    

transactionId    

f901b782bfdf4224\- 

9f8dda2cadc20c0d  

 Yes    

Transaction Id is required to identify the unique transaction for user\-initiated care context linking\.   

This chains all the steps to link care contexts\. Transaction Id will be returned after a successful discovery request to HIP by the patient\.    

patient     

\-    

Yes    

A list of records of the patient that were found as a result of the identifiers that the patient had provided\.    

referenceNumber    

example01    

Yes    

Reference number of the patient details    

careContexts    

\-    

Yes    

List of care contexts linked at the HIP end for the identified patient\.    

hiType    

PRESCRIPTION    

Yes    

HiType of the patient details    

Count    

1    

Yes    

The count of care contexts that are found for the patient in scope    

createdAt    

2023\-06\-   

13T08:05:43\.030Z   

Yes    

    

The time at which the on discover API is invoked    

requestId    

d89525a23a3f\-  

4d39\-   

98b5\-   

477afb1865f6    

Yes    

Request ID sent by in on\-discover API call\. This request ID will be used to match the flow of linking care contexts for a patient    

__Request Body:  __   

Request Body:    

\{    

    "transactionId": "0d36501c\-551a\-4bb5\-b247\-eec4bb42984b",    

    "patient": \[    

        \{    

            "referenceNumber": "example01",    

            "display": "abcd\-display",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "abcd",    

                    "display": "123\-display"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \],    

    "createdAt": "2023\-06\-13T08:05:43\.030Z",    

    "response": \{    

        "requestId": "d89525a2\-3a3f\-4d39\-98b5\-477afb1865f6"    

    \}    

\}    

__ __   

__Response:  __   

__ __   

Response    

Code: 200 OK     

    

[image removed - see original document]       

 

Error response: 

 

[image removed - see original document]

    

### <a id="_Toc376291"></a>5\.3\.5 Patient health record link init    

This API will be invoked by the patient to link his/her health records\.    

    

__URL:__ /api/hiecm/user\-initiated\-linking/v3/link/care\-context/init   

__Request:__ POST   

__Header Parameters: __    

Property  Name    

Example Value    

Required    

Description    

Authorizatio   

n     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YX NhbnRoYWt1bWFyLmtlc2F2YW5Ac2J4Ii wiY2xpZW50SWQiOiJzYngiLCJzeXN0ZW 0iOiJBQkhBLUEiLCJyZXF1ZXN0ZXJJZCI6Il BIUi1XRUIiLCJwaHJNb2JpbGUiOm51bGw sImV4cCI6MTY2NzI5ODExNSwiaWF0Ijox NjY3MjkwOTE1LCJwaHJBZGRyZXNzIjoid mFzYW50aGFrdW1hci5rZXNhdmFuQHNi eCIsInR4bklkIjoiYjEwMGM4ZDMtNTE1ZC0 0YWFiLTg1OWQtYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for track the end\-toend request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

Actual time when request was initiated, 

ISO Date time format represents date and time    

X\-AUTHTOKEN 

 eyJhbGciOiJSUzUxMiJ9\.eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2    

    

JWT Authentication token which was issued by ABDM after successful validation of username and password    

X\-HIU\-ID     

HIU\_ID    

Yes     

Identifier of the health information user by which the request was initiated    

X\-CM\-ID     

sbx     

Yes     

Suffix of the consent manager to which the request was intended     

__Body Parameters:  __   

Property Name    

Example Value   

Required    

Description    

transactionId    

f901b782bfdf4224\-

9f8dda2cadc20c0d 

 Yes    

   

   

Transaction Id is required to identify the unique transaction for user\-initiated care context linking\. This chains all the steps to link care contexts\. Transaction Id will be returned after successful discovery request to HIP by the patient\.    

abhaAddress    

user\_123@sbx    

No    

The abha address of the patient    

patient     

\-    

Yes    

A list of records of the patient that were found as a result of the identifiers that the patient had provided\.  

referenceNumber    

example01    

Yes    

Reference number of the patient details    

careContexts    

\-    

Yes    

List of care contexts linked at the HIP end for the identified patient\.    

hiType    

PRESCRIPTION    

Yes    

HiType of the patient details    

Count    

1    

Yes    

The count of care contexts that are found for the patient in scope    

__ __   

__Request Body:  __   

Request Body:    

\{    

    "transactionId": "66446ece\-396b\-4f22\-a1a6\-756196fdffc9",    

   "abhaAddress": "user\_123@sbx",    

    "patient": \[    

        \{    

            "referenceNumber": "example01",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "123"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}     \]    

\}    

__Response:  __   

Response    

  

Code : 202 Accepted    	  

__ __   	  

__Error scenarios: __   

__ __   

__Scenarios __   

__Headers/Body __   

__Message __   

Verify when transaction id is invalid, null or blank     

"transactionId": "",    

"error": \{    

    "code": "ABDM\-1010",        "message": "test"    

\},    

"response": \{    

    "requestId": "926ca4adaef54937a26cc2b529464566"    

\}    

    

"code": "ABDM\-9999: ",    

 "message"    	: "Invalid Transaction ID"

   

Verify  message   when count   is incorrect     

"transactionId": "776a9becab1242bc9ae9c63b1ae5bce2",    

"patient": \[    

    \{    

        "referenceNumber": "Testing defect",    

        "careContexts": \[    

            \{    

                "referenceNumber": "1234",    

                "display": "12"    

            \} \],    

        "hiType": "PRESCRIPTION",    

            

"count": 0   \}    

    

"\{    

        "code": "ABDM\-1059: ",    

"message": "Invalid Care Contexts count"    

\}"    

To verify  when  

Request ID is  Blank, null or empty in header  

 \[    

    \{    

        "key": "REQUEST\-ID",            

 "value": "",    

        "type": "text"    

    \}   \]    

Access Denied    

Code : 403 Forbidden    

To verify when invalid RequestID is pass in header  

\[    

    \{    

          "key": "REQUEST\-ID",    

        "value": "\{\{$guid\}\}zxzzxs",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1030: ",    

    "message": "Invalid request ID"    

\}    

 Code:   400Bad Request     

When    

Timestamp    

is Blank, null or empty in header\.   

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied    

Code : 403 Forbidden     

   

When invalid Timestamp  is pass in header    

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "\{\{$isoTimestamp\}\}jhgftytgtyu",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1016: ",    

    "message": "Invalid Timestamp"    

\}    

 Code    \- 400Bad Request    

When X\-CM\-   

ID is Invalid, Blank, null or empty in header\.  

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"    

    \}   \]    

Access Denied    

 Code   : 403 Forbidden     

When X\-HIU\-   

ID is Blank, null or empty in header\.  

\[    

     \{    

         "key": "X\-HIU\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied    

Code : 403 Forbidden     

    

When  

XAUTHTOKEN    is Invalid, Blank, null or empty in header\.     

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"    

    \}   \]    

\{    

    "code": "ABDM\-1065: ",    

    "message": "Invalid X Auth token"    

\}    

    

When the careContexts is null or empty\.    

"transactionId": "776a9becab1242bc9ae9c63b1ae5bce2",    

"patient": \[    

    \{    

        "referenceNumber": "Testing defect",    

        "careContexts": \[\],    

        "hiType": "PRESCRIPTION",    

            

"count": 0   \}    

    

\{    

    "code": "ABDM\-1057: ",    

    "message": "Invalid Care    Contexts"    

\}    

    

When    

link/init is called after discovery request expired\.   

    

\{    

    "code": "ABDM\-1086: ",    

    "message": "Invalid Transaction   ID 

/ Transaction expired\."    

\}    

    

    

### <a id="_Toc376292"></a>5\.3\.6 HIE\-CM callback on health record link init    

This API will be invoked by the HIE\-CM to initiate the linking of patient health records to  

HIP\.    

__URL: __\{callback\_url\}/api/v3/hip/link/care\-context/init   __Request:__ POST  

 __Header Parameters: __    

Property Name    

Example Value    

   

Required    

Description    

REQUEST\-ID     

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

Yes     

   

Unique UUID for tracking the end\-to\-end request transaction     

TIMESTAMP     

2022\-10\-   

06T10:10:00\.587Z     

Yes     	   

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-HIP\-ID     

IN2810014366    

Yes     	   

Identifier of the health information provider to which the request was intended    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac   

2J4IiwiY2xpZW50SWQiOi  

JzYngiLCJzeXN0ZW0iOiJ   

BQkhBLUEiLCJyZXF1ZXN0Z   

XJJZCI6IlBIUi1XRUIiLCJwa  HJNb2JpbGUiOm51bGws  

ImV4cCI6MTY2NzI5ODEx   NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt   

Yes     	   

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

   

NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0    

   

   

__Body Parameters:  __   

__Property Name__     

__Example Value__     

__Required__     

__Description__     

transactionId    

f901b782\-bfdf\-4224\-   9f8d\-da2cadc20c0d    

Yes    

Transaction Id is required to identify the unique transaction for user\-initiated care context linking\. 

This chains all the steps to link care contexts\. Transaction Id will be returned after a successful discovery request to HIP by the patient\.    

abhaAddress    

9162484106XXXX@sbx   

    

ABHA addresses which the linking of care contexts should be initiated by the HIP\.    

patient     

\-    

Yes    

A list of records of the patient that were found as a result of the identifiers that the patient had provided\.    

referenceNumber    

example01    

Yes    

Reference number of the patient details    

careContexts    

\-    

Yes    

List of care contexts linked at the HIP end for the identified patient\.    

hiType    

PRESCRIPTION    

Yes    

HiType of the patient details    

Count    

1    

Yes    

The count of care contexts that are found for the patient in scope    

__Request Body:  __   

Request Body:    

\{    

    "transactionId": "5042908f\-dac4\-43dd\-99b9\-9b5bedad32ea",    

    "abhaAddress": "9162484106XXXX@abdm",    

    "patient": \[    

        \{    

            "referenceNumber": "example01",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "123"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \]    \}    

__ __   

__ __   

__ __   

__Response:  __   

__ __   

Response    

Code : 200 OK     

    

[image removed - see original document]       

Error Response : \(Already linked care context \) 

[image removed - see original document]

 

### <a id="_Toc376293"></a>5\.3\.7 HMIS/LMIS response on health record link                                          

    

This API will be invoked by the __HMIS/LMIS__ to share the response of link init API   

\(referenceNumber will be generated by HIP and this will used in the confirm API\)    

__URL:__ /api/hiecm/user\-initiated\-linking/v3/link/care\-context/on\-init    

__Request:__ POST  

__Header __ 

__Parameters: __    

Property    

Name    

Example Value    

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhb nRoYWt1bWFyLmtlc2F2YW5Ac2J4IiwiY2xpZW 50SWQiOiJzYngiLCJzeXN0ZW0iOiJBQkhBLUEi  

LCJyZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJN   

Yes     

JWT Access token which was issued by ABDM session API after successful    

   

b2JpbGUiOm51bGwsImV4cCI6MTY2NzI5ODE xNSwiaWF0IjoxNjY3MjkwOTE1LCJwaHJBZGRy ZXNzIjoidmFzYW50aGFrdW1hci5rZXNhdmFu   

QHNieCIsInR4bklkIjoiYjEwMGM4ZDMtNTE1ZC0   

0YWFiLTg1OWQtYzNlMTUwOTE3ZGY1In0    

   

validation of client id and secret    

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8     

Yes     

Unique UUID for track the end to end request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

Actual time when request was initiated, ISO Date time format represents date and time    

X\-CM\-ID     

sbx     

Yes     

Suffix of the consent manager to which the request was intended    

__Body Parameters:  __   

Property   Name    

Example Value    

Required    

Description    

transactionId    

f901b782\-bfdf\-4224\-9f8d\-da2cadc20c0d    

Yes    

Transaction Id is required to identify the unique transaction for user initiated care context linking\. This chains all the steps to link care contexts\.Transaction Id will be returned after successful discovery request to HIP by the patient\. 

Link    

\{    

        "referenceNumber": "3336268d\-89a34c84\-  

8674\-aef42092d9fc",    

        "authenticationType": "MEDIATE",    

        "meta": \{    

            "communicationMedium": "MOBILE",    

            "communicationHint": "OTP",    

            "communicationExpiry": "2023\-  

1230T12:01:55\.324Z"    

        \}    

Yes    

The details of the link using which the records has to be linked to the patient’s ABHA account\. It will contain details like the referenceNumber,   

authenticationType and the meta details

of the link    

requestId    

2b835afb\-0c97\-4ce7\-9dd9ef58ee98a326    

Yes    

Request ID sent in init API call\. This request ID will be used to match the flow of linking care contexts for a patient    

__Request Body:  __   

Request Body:    

  

\{    

    "transactionId": "66446ece\-396b\-4f22\-a1a6\-756196fdffc9",    

    "link": \{    

        "referenceNumber": "3336268d\-89a3\-4c84\-8674\-aef42092d9fc",    

        "authenticationType": " MEDIATE",    

        "meta": \{    

            "communicationMedium": "MOBILE",    

            "communicationHint": "OTP",    

            "communicationExpiry": "2023\-12\-30T12:01:55\.324Z"    

        \}    

    \},    

    "response": \{    

        "requestId": "2b835afb\-0c97\-4ce7\-9dd9\-ef58ee98a326"    

    \}    

\}    

__Response:  __   

Response    

Code : 202 Accepted     

    

__Error scenarios: __   

    

__Scenarios __   

__Headers/Body __   

__Message __   

Verify when transaction id is invalid, null or blank     

\{    

    "transactionId": "",    

    "link": \{    

        "referenceNumber": "Testing defe ct",    

        "authenticationType": " MEDIATE",    

        "meta": \{    

            "communicationMedium": "MO   

BILE",    

            "communicationHint": "OTP",    

            "communicationExpiry": "202306\-  

31T12:33:37\.603Z"    

        \}    

    \},    

    "response": \{    

        "requestId": "3a95d49d\-c06b46cf\-99b4\-  

695ec53316e2"    

    \}    

\}     

“Code”: " ABDM\-9999: ",    

“message”: "Invalid Transaction    

Id \."    

   

Verify message when communication    

expiry date is invalid or null  

"\{    

    ""transactionId"": """",    

""link"": \{    

    ""referenceNumber"": ""Testing defe ct"",    

    ""authenticationType"": ""DIRECT"",    

    ""meta"": \{    

        ""communicationMedium"": ""MO   

BILE"",    

        ""communicationHint"": ""OTP"",    

        ""communicationExpiry"": ""2023\-   06\-31T12: 33: 37\.603Z""    

    \}    

\},    

""response"": \{    

    ""requestId"": ""3a95d49d\-c06b46cf\-99b4\-  

695ec53316e2""    

\}    

\} "    

\{    

    "code": "ABDM\-9999: ",    

    "message": "Invalid communica tion   expiry date\."    

\}    

400 Bad Request    

     

Verify message when  request ID is invalid or null   

"\{    

    ""transactionId"": """",    

""link"": \{    

    ""referenceNumber"": ""Testing defe ct"",    

    ""authenticationType"": "" MEDIATE"",    

    ""meta"": \{    

        ""communicationMedium"": ""MO   

BILE"",    

        ""communicationHint"": ""OTP"",    

        ""communicationExpiry"": ""2023\-   06\-31T12: 33: 37\.603Z""    

    \}    

\},    

""response"": \{    

    ""requestId"": ""3a95d49d\-c06b46cf\-99b4\-  

695ec53316e2""    

\}  \}"       

\{    

    "code": "ABDM\-9999: ",    

    "message": "Invalid request ID"    

\}    

400 Bad Request    

     

When the   

referenceNumber is null or empty\.    

\{    

    "transactionId": "",    

"link": \{    

    "referenceNumber": ",    

    "authenticationType": " MEDIATE",    

    "meta": \{    

        "communicationMedium": "MOBIL   

E",    

        "communicationHint": "OTP",    

        "communicationExpiry": "2023\-   06\-31T12: 33: 37\.603Z"    

    \}    

\{    

    "code": "ABDM\-9999: ",    

    "message": "Invalid reference  number\." 

\}     

   

   

\},    

"response": \{    

    "requestId”: "3a95d49d\-c06b46cf\-99b4\-  

695ec53316e2"    

\}    

\}    

    

   

   

When the   

authenticationTypeis null or empty\.    

\{    

    "transactionId": "",    

"link": \{    

    "referenceNumber": “12345",    

    "authenticationType": "",    

    "meta": \{    

        "communicationMedium": "MOBIL   

E",    

        "communicationHint": "OTP",    

        "communicationExpiry": "2023\-   

06\-31T12: 33: 37\.603Z"    

    \}    

\},    

"response": \{    

    "requestId”: "3a95d49d\-c06b46cf\-99b4\-  

695ec53316e2"    

\}    

\}    

    

\{    

    "code": "ABDM\-9999: ",     "message":   

“Invalid authentication type”    

\}     

When the   

communicationMedi um is null or empty\.    

\{    

    "transactionId": "3a95d49d\-c06b46cf\-99b4\-  

695ec53316e2",    

"link": \{    

    "referenceNumber": “12345",    

    "authenticationType": "",    

    "meta": \{    

        "communicationMedium": "",    

        "communicationHint": "OTP",    

        "communicationExpiry": "2023\-   06\-31T12: 33: 37\.603Z"    

    \}    

\},    

"response": \{    

    "requestId”: "3a95d49d\-c06b46cf\-99b4\-  

695ec53316e2"    

\}    

\}    

    

\{    

    "code": "ABDM\-9999: ",    

    "message": “Invalid   communication medium”    

\}     

When the   

communicationHint is null or empty\.    

\{    

    "transactionId": "3a95d49d\-c06b46cf\-99b4\-  

695ec53316e2",    

"link": \{    

    "referenceNumber": “12345",    

    "authenticationType": "",    

    "meta": \{    

        "communicationMedium": "DIREC   

T",    

        "communicationHint": "",    

        "communicationExpiry": "2023\-   06\-31T12: 33: 37\.603Z"    

    \}    

\},    

"response": \{    

    "requestId”: "3a95d49d\-c06b46cf\-99b4\-  

695ec53316e2"    

\}    

\}    

    

\{    

    "code": "ABDM\-9999: ",     "message":   

“Invalid communication hint”    

\}     

    

    

### <a id="_Toc376294"></a>5\.3\.8 HIE\-CM response on health record link                                                               

    

This is a callback API that will be invoked by the HIE\-CM to share the response of the link oninit request from HIP    

__URL:__ \{callback\_url\}/api/v3/hiu/patient/care\-context/on\-init  __Request:__ POST    

__Header Parameters: __    

__Property Name__     

__Example Value__     

__Required__     

__Description__     

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac   

2J4IiwiY2xpZW50SWQiOi   

JzYngiLCJzeXN0ZW0iOiJ   

BQkhBLUEiLCJyZXF1ZXN0Z   

XJJZCI6IlBIUi1XRUIiLCJwa  

HJNb2JpbGUiOm51bGws   

ImV4cCI6MTY2NzI5ODEx   NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0    

Yes    

JWT Access token which was issued by ABDM session API after successful validation of client id and secret\.    

REQUEST\-ID     

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

Yes     

Unique UUID for track the end to end request transaction     

TIMESTAMP     

2022\-10\-   

06T10:10:00\.587Z     

Yes     

Actual time when request was initiated, ISO Date time format represents date and time    

X\-HIU\-ID     

IN2810014366    

Yes     

Identifier of the health information user to which the request was intended    

__Body Parameters:  __   

Property   Name    

Example Value    

Required    

Description    

 

 

 

transactionId   

 f901b782\-bfdf\-4224\-9f8d\-   

da2cadc20c0d    

Yes    

Transaction Id is required to identify the unique transaction for user initiated care context linking\. This chains all the steps to link care contexts\.Transaction Id will be returned after successful discovery request to HIP by the patient\.    

Link    

\{    

    "referenceNumber": "4336268d\-89a34c84\-  

8674\-aef42092d9fc",    

    "authenticationType": " MEDIATE",    

    "meta": \{    

"communicationMedium": "MOBILE",         

"communicationHint": "OTP",         

"communicationExpiry": "2023\-  

1230T12:01:55\.324Z"    

    \}   \}    

No    

The details of the link using which the records have to be linked to the patient’s   ABHA account\. It will contain details like the referenceNumber,    

authenticationType and the meta details of 

the link    

error    

"error": \{    

    "code": 1000,    

    "message": "string"    

  \}    

No    

The error code and message if any occurred\.    

requestId    

2b835afb\-0c97\-4ce7\-9dd9ef58ee98a326    

Yes    

Request ID sent in init API call\. This request ID will be used to match the flow of linking care contexts for a patient    

__ __   

__Request Body:  __   

Request Body:    

\{    

    "transactionId": "5b39f73e\-b19a\-421a\-ab43\-c97cbd903041",    

    "link": \{    

        "referenceNumber": "4336268d\-89a3\-4c84\-8674\-aef42092d9fc",    

        "authenticationType": " MEDIATE",    

        "meta": \{    

            "communicationMedium": "MOBILE",    

            "communicationHint": "OTP",    

            "communicationExpiry": "2023\-12\-30T12:01:55\.324Z"    

        \}    

    \},    

    "response": \{    

        "requestId": "14a298b4\-cf4a\-497b\-b4c1\-72b50295fb91"    

    \}    

\}    

__ __   

__Response:  __   

__ __   

Response  

  	  	  

Code : 202 Accepted     	  	  	  

    

[image removed - see original document]    

    

    

### <a id="_Toc376295"></a>5\.3\.9 Patient health record confirm                 

    

This API will be invoked by the __patient __to confirm his/her health records\.    

__URL:__ /api/hiecm/user\-initiated\-linking/v3/link/care\-context/confirm   

__Request:__ POST   __Header Parameters: __    

Property    

Name    

Example Value    

Required    

  

Description    

  

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXN hbnRoYWt1bWFyLmtlc2F2YW5Ac2J4IiwiY 2xpZW50SWQiOiJzYngiLCJzeXN0ZW0iOiJ   

BQkhBLUEiLCJyZXF1ZXN0ZXJJZCI6IlBIUi1XR   

UIiLCJwaHJNb2JpbGUiOm51bGwsImV4c  

CI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mjkw  OTE1LCJwaHJBZGRyZXNzIjoidmFzYW50aG FrdW1hci5rZXNhdmFuQHNieCIsInR4bklkIj oiYjEwMGM4ZDMtNTE1ZC00YWFiLTg1OWQ tYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for track the end to end request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

Actual time when request was initiated, ISO Date time format represents date and time    

X\-AUTH\-TOKEN    

eyJhbGciOiJSUzUxMiJ9\.eyJzdWIiOiJ2 YXNhbnRoYWt1bWFyLmtlc2F2    

    

JWT Authentication token which was issued by ABDM after successful validation of username and password    

X\-HIU\-ID     

HIU\_ID    

Yes     

Identifier of the health information user by  which the request was    

initiated    

X\-CM\-ID     

sbx     

Yes     

Suffix of the consent manager to which the request was intended     

__ __   

__ __   

__ __   

__Body Parameters:  __   

Property Name    

Example Value    

Required    

Description    

linkRefNumber    

“4336268d\-89a3\-4c84\-  

8674aef42092d9fc”    

Yes    

Link reference number used while initiating the linking of health records of the patient    

token    

“123456”    

Yes    

OTP generated during init process to confirm the linking    

__Request Body:  __   

Request Body    

\{    

    "token": 123456,    

    "linkRefNumber": "4336268d\-89a3\-4c84\-8674\-aef42092d9fc" \}    

__Response: __   

Response  

  	  	  

Code : 202 Accepted     	  	  	  

    

__Error scenarios: __   

__ __   

__Scenarios __   

__Headers/Body __   

__Message __   

To verify  when   

Request ID is  Blank, null or empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403     

Forbidden     

     

To verify when invalid RequestID is pass in header   

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}    

\]     

\{    

    "code": "ABDM\-1030: ",     "message":   

"Invalid    

request ID"    

\}    

     

 Code: 400Bad Request     

     

When   

Timestamp is   Blank, null or empty in header\.  

\[    

    \{    

        "key": "TIMESTAMP",             "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

     

When invalid Timestamp is pass in header    

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",    

        "type": "text"    

    \}   \]        

\{    

    "code": "ABDM\-1016: ",    

    "message": "Invalid Timestamp"    

\}    

     

Code \- 400Bad Request    

    

When X\-   HIU\-ID is Blank, null or empty in header\.      

\[    

    \{    

        "key": "X\-HIU\-ID",    

        "value": "",    

        "type": "text"    

    \}    

\]     

Access Denied     

Code : 403 Forbidden     

When X\-CM\-   

ID is Invalid, Blank, null or empty in header\.  

\[    

    \{    

        "key": "X\-CM\-ID",    

  	   

        "value": "sbxdvdfvdf",  

        "type": "text"    

    \}    

\]     

Access Denied     

Code : 403 Forbidden     

When 

XAuthTOKEN   is Invalid in header\.    

\[    

    \{    

        "key": "X\-LINK\-TOKEN",    

        "value": "hghhjjkhjkbkjbjkbkjbnkjbk",    

        "type": "text"    

    \}    

\]     

\{    

    ""code"": ""ABDM\-1066: "",    

    ""message"": ""Invalid     

JWT token""    

\}    

    

	Code    	 \- 400Bad Request"    

Verify  

message  when invalid token is passed    

\{    

    "token": 7897654,    

    "linkRefNumber": "Testing defect"    

\}     

    

\{    

    "code": "ABDM\-9999: ",     "message":  

Invalid link reference number\."    

\}     

Verify  

message  when the X\-  HIU\-ID is different from the hiu that initiated link request\.    

   

\{    

    "code": "ABDM\-1040: ",    

    "message": “Invalid HIU ID\."    

\}     

     

    

    

### <a id="_Toc376296"></a> 5\.3\.10   HIE\-CM callback for health record confirmation     

    	    	    	    	    	    	    	    	    

This API will be invoked by the __HIE\-CM__ to confirm patient health records to HIP    

__URL:__ \{callback\_url\}/api/v3/hip/link/care\-context/confirm  

 __Request:__ POST   __Header Parameters: __    

Property Name    

Example Value    

Required    

Description    

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endto\-end request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

Actual time when request was initiated, ISO Date time format represents date and time    

X\-HIU\-ID     

IN2810014366    

Yes     

Identifier of the health  information provider to which the request was intended    

__Body Parameters:  __   

Property Name    

Example Value    

Required    

Description    

linkRefNumber    

“4336268d\-89a3\-4c84\-8674aef42092d9fc”    

Yes    

Link reference number used while initiating the linking of health records of the patient    

Token    

“123456”    

Yes    

OTP generated during init process to confirm the linking    

__Request Body:  __   

Request Body:    

 \{    

    "confirmation": \{    

        "token": "123456",    

        "linkRefNumber": "4336268d\-89a3\-4c84\-8674\-aef42092d9fc"    

    \}    

\}    

__Response:  __   

Response  

Code : 202 Accepted     

    

[image removed - see original document]       

### <a id="_Toc376297"></a>5\.3\.11 HMIS/LMIS response on health record confirm                                                

This API will be invoked by the __HIP __to share the response of link confirmation API    

__URL:__ /api/hiecm/user\-initiated\-linking/v3/link/care\-context/on\-confirm  __Request:__ 

POST   

 __Header Parameters:__    

Property   Name    

Example Value    

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhb nRoYWt1bWFyLmtlc2F2YW5Ac2J4IiwiY2xpZW 50SWQiOiJzYngiLCJzeXN0ZW0iOiJBQkhBLUEi LCJyZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJN b2JpbGUiOm51bGwsImV4cCI6MTY2NzI5ODE xNSwiaWF0IjoxNjY3MjkwOTE1LCJwaHJBZGRy ZXNzIjoidmFzYW50aGFrdW1hci5rZXNhdmFu   

QHNieCIsInR4bklkIjoiYjEwMGM4ZDMtNTE1ZC0   

0YWFiLTg1OWQtYzNlMTUwOTE3ZGY1In0    

Yes     

JWT Access token which was issued by ABDM session API after successful validation of client id and secret     

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8     

Yes     

Unique UUID for track the end to end request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

Actual time when request was initiated, ISO Date time format represents date and time    

X\-CM\-ID     

sbx     

Yes     

Suffix of the consent manager to which the request was intended     

__Body Parameters: __   

Property Name    

Example Value    

Required    

Description    

patient     

\-    

Yes    

A list of records of the patient that were found as a result of the identifiers that the patient had provided\.    

referenceNumber    

“4336268d\-89a34c84\-  

8674aef42092d9fc”    

Yes    

Link reference number used while initiating the linking of health records of the patient    

Display    

Display Text    

No    

The display text for patient reference    

careContexts    

\-    

Yes    

List of care contexts linked at the HIP end for the identified patient\.    

hiType    

PRESCRIPTION    

Yes    

HiType of the patient details    

Count    

1    

Yes    

The count of care contexts that are found for the patient in scope    

requestId    

f207e461\-1994\- 

42749b86554384f170ab    

Yes    

Request ID sent in init API call\. This request ID will be used to match the flow of linking care contexts for a patient    

__Request Body: __   

Request Body:    

\{    

    "patient": \[    

        \{    

            "referenceNumber": "4336268d\-89a3\-4c84\-8674\-aef42092d9fc",             "display": "abcdefgdisplay",                "careContexts": \[    

                \{    

                    "referenceNumber": "1234",    

                    "display": "1234\-display"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \],    

    "response": \{    

        "requestId": "f207e461\-1994\-4274\-9b86\-554384f170ab"    

    \}   \}    

__Response: __   

Response  

  	  

Code : 202 Accepted     	  	  

__ __ 

__ __ 

__ __ 

__Error scenarios: __   

__ __   

__Scenario__ __s __   

__Request Body __   

__Response __   

  

To verify  when   

Request ID is Blank,  null or empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

To verify  when    

invalid    Request\-ID is pass in header  

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",             "type": "text"    

    \}\]    

\{    

    "code": "ABDM\-1030: ",    

    "message": "Invalid request ID"    

\}    

Code: 400Bad Request     

    

When X\-   HIP\-ID is   Blank, null or empty in header\.      

\[    

    \{    

        "key": "X\-HIP\-ID",    

        "value": "",           

"type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

    

When X\- CM\-ID 

is   

Invalid,    

Blank, null or empty in header\.     

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"    

    \}   \]    

Access Denied     

Code : 403 Forbidden     

Verify  

message  when request id is passed    

\{    

    "patient": \[    

        \{    

            "referenceNumber": "Testing defe ct",    

            "display": "bg",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "1234",    

                    "display": "12"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \],    

    "response": \{\}    

\}     

\{    

    "code": "ABDM\-1015",    

    "message": "Invalid Response"    

\}     

Verify    

message when   count is incorrect     

\{    

    "patient": \[    

        \{    

            "referenceNumber": "Testing defe ct",    

            "display": "bg",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "1234",    

                    "display": "12"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \],    

    "response": \{    

        "requestId": "f9d77c6b\-e918\-438da19f\-  

835f356c118b"    

    \}    

"\{    

        ""code"": ""ABDM\-9999: "",    

""message"": ""Invalid Care     

Contexts count, must range between 1 to    

20""    

\} "    

__ __   

__ __   

### <a id="_Toc376298"></a>	 	 5\.3\.12  HIE\-CM response on health record on\-confirm    	    	    

This is callback API will be invoked by the __HIE\-CM__ to share the response of on\-confirm API from HIP\.    

__URL:__ \{callback\_url\}/api/v3/hiu/patient/care\-context/on\-confirm    

__Request:__ POST    

__ __   

__Header Parameters: __   

Property Name    

Example Value    

Required    

Description    

REQUEST\-ID     

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8     

Yes     

Unique UUID for tracking the endto\-end request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-HIU\-ID     

IN2810014366    

Yes     

Identifier of the health information provider to which the request was intended    

__Body Parameters: __   

Property Name    

  

Example Value    

Required    

Description    

patient     

\-    	  

Yes    

A list of records of the patient that were found as a result of the identifiers that the patient had provided\.    

referenceNumber    

“4336268d\-89a34c84\-  

8674aef42092d9fc”    

Yes    

Link reference number used while initiating the linking of health records of the patient    

careContexts    

\-    

Yes    

List of care contexts linked at the HIP end for the identified patient\.    

hiType    

PRESCRIPTION    

Yes    

HiType of the patient details    

Count    

1    

Yes    

The count of care contexts that are found for the patient in scope    

requestId    

f207e461\-1994\- 

42749b86554384f170ab    

Yes    

Request ID sent in the init API call\. This request ID will be used to match the flow of linking care contexts for a patient    

__Request Body: __   

__ __   

Request Body  

\{    

    "patient": \[    

        \{    

            "referenceNumber": "4336268d\-89a3\-4c84\-8674\-aef42092d9fc",             "display": "abcdefgdisplay",    

            "careContexts": \[    

                \{    

                    "referenceNumber": "1234",    

                    "display": "1234\-display"    

                \}    

            \],    

            "hiType": "PRESCRIPTION",    

            "count": 1    

        \}    

    \],    

    "response": \{    

        "requestId": "f207e461\-1994\-4274\-9b86\-554384f170ab"    

    \}    

\}    

  

  

__Response: __   

__ __   

Response    

Code : 202 Accepted     

    

[image removed - see original document]    

__ __   

__ __   

# <a id="_Toc376299"></a>6\.Data Flow    

## <a id="_Toc376300"></a>6\.1 Overview    

The process of Data flow starts once the HIECM has generated Consent artefact \(Consent artefact is generated only if the status of Consent request is “Granted”\) and same is notified to HIP and HIU\. HIU sends pushback URL to HIP via HIECM\. HIP now bundles the care context or Health data of the patient as per FHIR standards and share the data via pushback data URL\. HIECM is notified the status of the data shared both by HIU and HIP\.    

    

## <a id="_Toc376301"></a>6\.2 Sequence Diagram    

    

[image removed - see original document]    

    

## <a id="_Toc376302"></a>6\.3 List of APIs    

    

### <a id="_Toc376303"></a>6\.3\.1 Callback API to HIP when a consent request is APPROVED/REVOKED    

__ __   

This API is a callback to HIP when a consent request is approved/revoked\.__ __   

__URL:__ \{callbackURL\}/api/v3/consent/request/hip/notify    

__Request:__ POST    

__ __   

__ __   

__ __   

__ __   

__ __   

__Header Parameters: __    

__Property Name __

   	__Example Value __   

__Required __   

__Description __   

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time__ __   

X\-HIP\-ID    

eyJhbGciOiJSUzUxMiJ9\.eyJzdWIiOiIx    

ODQ0MzgxMDgwNjQ0MEBhYmRt    

Yes    

Identifier to the health information provider\.    

__Body parameters:__     

Property Name    

Example Value    

  

Required    

Description    

 

 

Status    

GRANTED    

Yes    

  

The status of the consent artefact    

consentId    

3fa85f64\-5717\-4562b3fc\-  

2c963f66afa6    

Yes    

  

The consent artefact    

id    

createdAt    

2024\-05\-   

01T05:10:20\.123Z    

Yes    

  

The date when consent artefact was created\.    

patient    

    

abc@abdm    

Yes    

  

A unique and valid ABHA address suffix with @abdm for live and @sbx for  

Sandbox    

Hip    

ABDM\_HIP    

No    

  

Health information provider ID    

purpose – text    

Care Management    

Yes    

  

Purpose text of consent request    

Purpose\-code    

CAREMGT    

Yes    

  

Purpose code of consent request    

Purpose\-refUri    

www\.test\.com    

Yes    

  

Purpose refUri of consent request     

patientReference    

batman@tmh    

No    

  

Patient reference Id    

careContextReference    

Episode11    

No    

  

Care context reference    

Hiu    

Sub\_HIU    

Yes    

  

Health information user Id    

Requester\-name    

Smith    

Yes    

  

Name of the requester    

Requester\-identifiertype    

REGN01    

 Yes      

Requester identifier type    

Requester\-identifiervalue    

MH1001    

 Yes      

Requester identifier value    

Requester\-identifiersystem    

https://www\.mciindia\. org    

 Yes      

Requester identifier system   

hiTypes    

\["OPCONSULTATION",    

"WELLNESSRECORD"\]    

 Yes      

Type of document    

PermissionaccessMode    

VIEW    

 Yes      

Access mode of consent    

PermissiondateRange    

"from": "2023\-  

0509T08:58:09\.738Z",    

"to": "2023\-  

0510T08:58:09\.738Z"    

Yes    

Data range of permission required    

PermissiondateEraseAt    

2023\-05\-   

25T08:58:09\.738Z    

Yes    

Date of erase data    

Permissionfrequency\-value    

0    

Yes    

Frequency value for consent   

Permissionfrequencyrepeats   

 0    

Yes    

Frequency repeats for consent

Permissionfrequency\-unit    

HOUR    

Yes    

Frequency unit for consent    

Signature    

e8nY601CYDsC0FKoDj Sp\+7GeQ2s2R8oZncLC z5ce\+pEuDOr5bZV0aa HjwJg4b9S9V\+twjt4hb ojx3fl7egrt8\+0c\+lfPTi5 /bBUAQXCABTfFmtFU7 jn65HlTt8kgkiONx26ZB hJ0wX3xjYI72PPtzYIiT5 Q08YtDoILA62KceioV7l wuKssw7wC4ECbBAvR uXT121TmtrPhf\+0myJA TSnaajS06S6OthrKfZLN   

TUFf3pFiJzqouSTrjNblO   

X6DT2\+JuO3rom1Szz/0   

3c0HQG\+wWASv\+PO3   

J6uRs0UI4JvKmM/4tP   

\+Z\+/HPKM15K5U5K\+4p qf6czKrbIDpkT/kP8bG g==    

Yes    

Signature of signed consent artefact details\.    

grantAcknowledgeme   

nt    

False    

Yes    

The Boolean flag to denote if HIP acknowledged the callback\.    

__ __   

__ __   

__ __   

__ __   

__Request Body:__     

Request Body:    

 

 

 

[image removed - see original document]

      "permission": \{    

        "accessMode": "VIEW",    

        "dateRange": \{    

          "from": "2021\-09\-28T12:30:08\.573565Z",    

          "to": "2021\-09\-28T12:30:08\.573565Z"    

        \},    

        "dataEraseAt": "2021\-09\-28T12:30:08\.573565Z",    

        "frequency": \{    

          "unit": "HOUR",    

          "value": 1,    

          "repeats": 0    

        \}    

      \}    

    \},    

    "signature":    

"e8nY601CYDsC0FKoDjSp\+7GeQ2s2R8oZncLCz5ce\+pEuDOr5bZV0aaHjwJg4b9S9V\+twjt4hbojx3fl7e grt8\+0c\+lfPTi5/bBUAQXCABTfFmtFU7jn65HlTt8kgkiONx26ZBhJ0wX3xjYI72PPtzYIiT5Q08YtDoILA62Kce ioV7lwuKssw7wC4ECbBAvRuXT121TmtrPhf\+0myJATSnaajS06S6OthrKfZLNTUFf3pFiJzqouSTrjNblOX6D   

T2\+JuO3rom1Szz/03c0HQG\+wWASv\+PO3J6uRs0UI4JvKmM/4tP\+Z\+/HPKM15K5U5K\+4pqf6czKrbIDpk T/kP8bGg==",      "grantAcknowledgement": false    

  \}    \}    

__Response Body__:     

Response    

Status: 202 Accepted    

    

__ __   

### <a id="_Toc376304"></a>6\.3\.2 HIP to respond back to consent HIP notify    

__ __   

This API will be invoked by HIP to respond back to the callback API __ __   

__URL:__ /api/hiecm/consent/v3/request/hip/on\-notify     

__Request:__ POST   

__Header Parameters: __    

__Property Name __

   	__Example Value __   

__Required __   

__Description __   

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time__ __   

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

__Body parameters:__     

Property Name    

Example Value    

  

Required    

Description    

Status    

OK    

Yes    

  

The status of the consent notify\.    

consentId    

3fa85f64\-5717\-4562b3fc\-  

2c963f66afa6    

Yes    

  

The consent artefact    

id    

Error    

"error": \{    

    "code": "ABDM\-1001",        "message": "unable to connect database"    

  \}    

No    

  

The error code and message if any happened\.    

requestId     

3fa85f64\-5717\-4562b3fc\-  

2c963f66afa6    

Yes    

  

The request id from the  /consent/hip/notify    

__Request Body:__     

Request Body:    

  

\{    

  "acknowledgement": \{    

    "status": "OK",    

    "consentId": "e3c74829\-3f82\-4f94\-959e\-e10f57bcd57b"    

  \},    

  "error": \{    

    "code": "ABDM\-1001",    

    "message": "unable to connect database"    

  \},    

  "response": \{    

    "requestId": "6f0b4665\-a915\-4c92\-aa36\-65afb4a2cd71"    

  \}   \}    

__Response Body__:     

Response    

Status: 202 Accepted    

__ __   

### <a id="_Toc376305"></a>6\.3\.3 Data Flow \- Health information request – Callback to HIP    

    

This isa callback API triggered by HIE\-CM to notify HIP about the health information request\.    

__URL:__ \{callback\_URL\}/api/v3/hip/health\-information/request __Request:__ POST  __Header Parameters:__    

Property Name    

Example Value    

   

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac   

2J4IiwiY2xpZW50SWQiOi JzYngiLCJzeXN0ZW0iOiJ   

BQkhBLUEiLCJyZXF1ZXN0Z   

XJJZCI6IlBIUi1XRUIiLCJwa  

HJNb2JpbGUiOm51bGws   

ImV4cCI6MTY2NzI5ODEx   NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0    

Yes    

   

JWT Access token which was issued by ABDM session API after successful validation of client id and secret\.    

REQUEST\-ID     

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

Yes     

   

Unique UUID for tracking the end\-to\-end request transaction     

TIMESTAMP     

2022\-10\-   

06T10:10:00\.587Z     

Yes     

   

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-HIP\-ID     

IN2810014366    

Yes     

   

Identifier to the health information provider\.    

__Body Parameters:__ __ __   

Property    

Name    

Example Value    

Required    

Description    

Consent ID    

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

Yes    

Valid consent ID, which HIU must obtain to request patient data from a HIP    

DateRange    

\[    

    \{    

      "from": "1924\-07\-09T12:05:57\.151Z",    

      "to": "2024\-07\-17T12:05:57\.151Z"    

    \}   \]    

Yes    

Date Range against which the consent granted will be validated\.    

DataPushUrl    

https://webhook\.site/2cfcc184\-5d29\- 

4e2c974d3e56cbaa5cc1/v3/data/push    

Yes    

This is the URL provided by HIU to which HIP has to push the requested health information record    

cryptoAlg    

“ECDH”    

    

ECDH is a key sharing algorithm,  

  	most  commonly  

  	used   	to  send   	encrypted messages\.  

  	ECDH works  by multiplying your private 	key 	by another's public key to get a shared secret, then using that shared secret to  perform symmetric encryption   

curve    

“curve25519”    

Yes    

Key exchanges authentication    

expiry    

2124\-12\-09T00:00:00\.000Z    

Yes    

Actual time by when dataPushUrl is available     

parameters    

“Ephemeral public key”    

Yes    

Encryption and decryption key    

keyValue    

BFN7KTdOT0jIAExG2A8Jg\+01w    

MPWxptiGqwHRVvtiVEsUq2FR7P2    

UdqZxJyPJSeR6muai21iQhasNxnhh8I5M\+g="    

Yes    

key agreement protocol that allows two parties, each    

   

   

   

having an ellipticcurve public– private key pair, to establish a shared secret over an insecure channel    

__Request Body:__     

Request Body    

\{    

    "hiRequest": \{    

        "consent": \{    

            "id": "d6a83f24\-6c96\-421e\-b8b8\-844e5344ef69"    

        \},    

        "dateRange": \{    

            "from": "1924\-07\-09T12:05:57\.151Z",    

            "to": "2024\-07\-17T12:05:57\.151Z"    

        \},    

        "dataPushUrl": "https://webhook\.site/2cfcc184\-5d29\-4e2c\-974d3e56cbaa5cc1/v3/data/push",    

        "keyMaterial": \{    

            "cryptoAlg": "ECDH",    

            "curve": "Curve25519",    

            "dhPublicKey": \{    

                "expiry": "2124\-12\-09T00:00:00\.000Z",    

                "parameters": "Curve25519/32byte random key",    

                "keyValue":    

"BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1f m0DpA="    

            \},    

            "nonce": "0ka0stPfqmXWhX\+ODC/iOFMO0PXFdRjBdcEGbv55qqc="    

        \}    

    \}   \}      

__ __   

__Response: __   

__ __   

Response    

Code : 202 Accepted     

__ __   

__ __   

__ __   

__ __   

__ __   

### <a id="_Toc376306"></a>6\.3\.4 HIP acknowledgement to the health information request     

    

This API will be invoked by HIP to acknowledge the health information request by HIU\.    

__URL:__ /api/hiecm/data\-flow/v3/health\-information/hip/on\-request __Request:__ POST  __Header Parameters:__    

Property Name    

Example Value    

   

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac   

2J4IiwiY2xpZW50SWQiOi JzYngiLCJzeXN0ZW0iOiJ   

BQkhBLUEiLCJyZXF1ZXN0Z   

XJJZCI6IlBIUi1XRUIiLCJwa  

HJNb2JpbGUiOm51bGws   

ImV4cCI6MTY2NzI5ODEx   NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0    

Yes    

   

JWT Access token which was issued by ABDM session API after successful validation of client id and secret\.    

REQUEST\-ID     

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

Yes     

   

Unique UUID for tracking the end\-toend request transaction     

TIMESTAMP     

2022\-10\-   

06T10:10:00\.587Z     

Yes     

   

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

IN2810014366    

Yes     

   

Suffix of the consent manager to which the request was intended\.   

__Body Parameters: __   

Property Name    

Example Value    

   

Required    

Description    

  

transactionId    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

No    

   

Unique transaction id to track the health information request    

sessionStatus    

ACKNOWLEDGED    

No    

   

Status of the request    

Error    

    

No    

  

Error code and message if any occurred    

requestId    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

Yes    	  

Unique id to track end to end transaction    

__Request Body: __   

Request Body    

\{       

"hiRequest": \{    

        "transactionId": "18235d89\-cb13\-479d\-ad71\-7a57d5f669a8",         "sessionStatus":   "ACKNOWLEDGED"    

    \},    

    "response": \{    

        "requestId": "18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 “    

    \}    

\}    

__Request Body : Error scenario __ 

Request Body  

     \{  

"error": \{  

        "code": ABDM\-1001,  

        "message": " unable to connect database"  

    \},  

"response": \{  

        "requestId": "18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 "  

    \}  \}  

  

__ __ 

__Response: __   

__ __   

Response    

Code : 202 Accepted     

    

### <a id="_Toc376307"></a>6\.3\.5 HIP calling data push URL    

This API will be invoked by HIP to push the data to HIU\.    

__URL:__ /api\-hiu/data/notification   

__Request:__ POST    

__Body Parameters: __   

Property Name    

Example Value    

   

Required    

Description    

pageNumber    

1     

Yes    

   

The page number    

pageCount    

2    

Yes    

   

The total page count    

transactionId    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    	   

The transaction id that is generated when health information request initiated\. 

entries    

"entries": \[    

        \{"content": "\{\{content\}\}", 

            "media":    

"application/fhir\+json",    

Yes    	   

 

List of encrypted content details\.    

   

            "checksum":    

"\{\{checksum\}\}",    

               

"careContextReference":    

"\{\{care Context    

Reference\}\}"    

        \}    

    \]    

   	  

   

keyMaterial    

"keyMaterial": \{    

        "cryptoAlg": "ECDH",    

        "curve":    

"Curve25519",    

        "dhPublicKey": \{    

            "expiry": "*\{\{expiry date\}\}*",    

            "parameters":    

"Curve25519/32byte random  key",    

            "keyValue": "*\{\{Key value\}\}*"    

        \},    

        "nonce": "*\{\{nonce\}\}*"    

    \}    

    

Yes    

* *

*  *  

* *

* * 

* *  

Encryption/Decryption key  details    

__Request Body: __

  

 

Request Body

   

 

\{

 

  

 

    

"pageNumber": 0, 

  

 

    

"pageCount": 1, 

  

 

    

"transactionId": "\{\{transactionId\}\}", 

  

 

    

"entries": \[ 

  

 

        

"content": "\{\{content\}\}", 

\{

  

 

            

"media": "application/fhir\+json", 

  

 

            

"checksum": "\{\{checksum\}\}", 

  

 

            

"careContextReference": "\{\{care Context Reference\}\}" 

  

 

 

[image removed - see original document] 

 

        \}    

    \],    

    "keyMaterial": \{    

        "cryptoAlg": "ECDH",    

        "curve": "Curve25519",    

        "dhPublicKey": \{    

            "expiry": "\{\{expiry date\}\}",    

            "parameters": "Curve25519/32byte random key",               

"keyValue": "\{\{Key value\}\}"    

        \},    

        "nonce": "\{\{nonce\}\}"    

    \}    

\}    

__ __   

__Response: __   

__ __   

Response    

Code : 202 Accepted    

__ __   

### <a id="_Toc376308"></a>6\.3\.6 Health Information notify API     

    

This API will be called by HIU and HIP to notify the CM about the status of the data transfer\.    

    

HIP on the transfer of data would send sessionStatus \- one of \[TRANSFERRED, FAILED\]\. 

HIP would also send hiStatus for each careContextReference \- on of \[DELIVERED,  ERRORED\]    

    

HIU on receipt of data would send sessionStatus \- one of \[RECEIVED, FAILED\]\. For example, ERRORED when data was not sent or if invalid data was sent\. HIU would also send hiStatus for each careContextReference \- one of \[OK, ERRORED\]\.   __URL:__ /api/hiecm/data\-flow/v3/health\-information/notify    

__Request:__ POST    

__Header Parameters: __   

Property Name    

Example Value    

   

Required    

Description    

Authorization     

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac   

2J4IiwiY2xpZW50SWQiOi  

JzYngiLCJzeXN0ZW0iOiJ   

BQkhBLUEiLCJyZXF1ZXN0Z   

XJJZCI6IlBIUi1XRUIiLCJwa  HJNb2JpbGUiOm51bGws  

ImV4cCI6MTY2NzI5ODEx   NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0    

Yes    	   

JWT Access token which was issued by ABDM session API after successful validation of client id and secret\.    

REQUEST\-ID     

18235d89\-cb13\-479dad71\-  

7a57d5f669a8     

Yes     	   

Unique UUID for tracking the end\-toend request transaction     

TIMESTAMP     

2022\-10\-   

06T10:10:00\.587Z     

Yes     	   

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

IN2810014366    

Yes     	   

Suffix of the consent manager to which the request was intended\.   

__Body Parameters: __   

Property Name    

Example Value    

   	Required    

Description    

 

 

consentId    

97c3668e\-49e3\-4121b2d3\-  

1ca6d949cd8a    

Yes       

The consent artefact    

id    

transactionId    

e3472dad\-86c5\- 

42df9afdd7c13df2a564    

Yes       

The transaction id that is generated when health information request initiated\.    

doneAt    

    

2023\-05\-   

24T10:51:08\.374Z    

Yes       

UTC date when the data was transferred/received\.    

notifier    

    

"notifier": \{    

Yes       

Identifier 	to 	denote 

either   

HIP or HIU is calling this   

API    

   

            "type": "HIP",    

            "id": "HIP\-HOSPITAL"   

        \}    

  

    

   

statusNotification    

    

"statusNotification": \{    

            "sessionStatus":    

"TRANSFERRED",    

            "hipId": "HIP\-   

HOSPITAL",    

            "statusResponses"   

: \[    

                \{    

                    "careContextR  eference":  

"b18d2e56c5d241d0bbe932a8b7579f74",

                    "hiStatus": "OK",    

                    "description":    

"test care context"    

                \}    

            \]    

        \}    

Yes    

 

Status 	of 	the 	data 

transfer   

__Request Body: __   

Request Body

 

  

 

 

 

\{       

"notification": \{    

        "consentId": "97c3668e\-49e3\-4121\-b2d3\-1ca6d949cd8a",    

        "transactionId": "e3472dad\-86c5\-42df\-9afd\-d7c13df2a564",    

        "doneAt": "2023\-05\-24T10:51:08\.374Z",    

        "notifier": \{    

            "type": "HIP",    

            "id": "HIP\-HOSPITAL"    

        \},    

        "statusNotification": \{    

            "sessionStatus": "TRANSFERRED",                "hipId": "HIP\-HOSPITAL",    

            "statusResponses": \[    

                \{    

                    "careContextReference": "b18d2e56\-c5d2\-41d0\-bbe9\-32a8b7579f74",    

                    "hiStatus": "OK",    

                    "description": "test care context"    

                \}    

            \]    

        \}    

     

\}   

\}    

__ __   

__Response: __   

__ __   

Response    

Code : 202 Accepted     

\{    

 “status”: “Notification is Accepted”   

\}    

    

# <a id="_Toc376309"></a>7\.Scan and Profile Share    

## <a id="_Toc376310"></a>7\.1 Overview    

    

The User/Patient can share his/her basic KYC information with the    

HMIS/LIMS by scanning the QR Code using the integrator application \(Example: ABHA  

App\), which enables them to complete the seamless profile share during their visit\.         

The authenticity of the profile information is verified by the HIE\-CM internally before sharing with the HMIS/LIMS\.    

    

The content of the QR code is a URL \(sample for reference:  

https://phrsbx\.abdm\.gov\.in/shareprofile?hipid=IN3410000260&counterid=12345\) that contains 2 parameters:    

- The HIP ID    
- Facility defined context \(for example: counter code\)    

      

    

    

    

    

    

    

    

      

## <a id="_Toc376311"></a>7\.2 Sequence Diagram    

    

[image removed - see original document]    

    

## <a id="_Toc376312"></a>7\.3 List of APIs    

    

### <a id="_Toc376313"></a>7\.3\.1 Profile share    

    

This API will be invoked from the integrator application \(any PHR application, just like ABHA\) to share the user/patient profile with HMIS/LIMS\.    

    

__URL:__ /api/hiecm/patient\-share/v3/share    

__Method:__ POST    

__Request Headers: __   

__ __   

Property   

Name    

Example Value    

Require  

d    

Descriptio  

n    

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction    

 

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time  

Authorizatio  n    

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc  

2F2    

YW5Ac2J4IiwiY2xpZW50SWQiOiJz    

YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL    

CJwaHJNb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwia    

WF0IjoxNjY3MjkwOTE1LCJwaHJBZ    

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX    

NhdmFuQHNieCIsInR4bklkIjoi    

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O    

WQtYzNlMTUwOTE3ZGY1In0    

Yes    

JWT Access token which 

was issued    

by ABDM  session API after successful validation of client id and secret    

X\-HIU\-ID    

IN2810014366    

Yes    

Identifier of the health information user to which the request was intended   

X\-CM\-ID    

sbx    

Yes    

Suffix of the  consent manager to which the request was intended    

X\- 

AUTHTOKEN   

eyJhbGciOiJSUzUxMiJ9\.eyJzdWIiOiJna XJpamFAc2J4IiwiY2xpZW50SWQiOiJQS FItV0VCIiwicmVxdWVzdGVySWQiOiJrX 2hpcCIsInN5c3RlbSI6IkFCRE0iLCJtb2Jp bGUiOiI4MjgxMTQ3MDgwIiwiZXhwIjoxNj c3NjY5NDU1LCJpYXQiOjE2Nzc2NjIyNTUs InRyYW5zYWN0aW9uSWQiOiJkMmY5O  

TNkNi1kODg4LTQyMTMtOTc3My0wYmJj MzMwMjVhNGYiLCJhYmhhQWRkcmVzc   

yI6ImdpcmlqYUBzYngifQ\.Ad\_jGrduH6 \_krBBnlRO912mQabxMOiB0GN6FjdZjoi  

CQY4AkUD3McGq2NR\-XGAjHVpkRtKx69m4\_44h\-   

FqTCbZlo09hq0SEM1KBMkPDl163JcFNM JGnXBa5E\-mu6DpBSPA\- VirSvBVj6CEpZLbTa2nBBSJJi\_leszwHNr   

kdope6rSc2G3SJfCW\_DzFmzd\_fxdvbFCN1yyhN3Rw5r8A1GnSrVSBhRjm4qy5O  

\_ gutl1XW9CaBaZSah7GOxGRr4gpSIJJvIL   

WovwG58DyNzEhrHtAfIje\_pegqRsNMO   

FI\-   

xPYJd2x6CcDKSoAXvXO0jbuoOvlPl5kh plOKU\-WcFeWA    

Yes    

JWT Access token which was issued by IDP service after successfully user    authenticatio  

n __ __       

__ __   

__Body Parameters:__    

__ __   

Property    

Name    

Example Value    

Require d  

  	Description    

intent    

"PROFILE\_SHARE"    

Yes    

This is a key value pair which contains the purpose with following possible values\.    

 Profile\_share    

 Payment    

 Health\_record\_sharing    

metaData    

\{    

  "hipId": "Test\_HIP",   "context":   

"ABC123",   "hprId":    

"abdulkalam@abdm",      "latitude": "\-38\.679",    

  "longitude": "58\.498" \}    

Yes    

This is a key value pair which contains the location longitude and latitude    

profile    

\{    

        "patient": \{    

            "abhaNumber":    

18443810806111,    

            "abhaAddress":    

"1844381@abdm",    

Yes    

This is key value pair which contains patient details    

   

            "name": "User 1",    

            "gender": "M",    

            "dayOfBirth": "20",    

            "monthOfBirth": "1",    

            "yearOfBirth": "1999",    

            "address": \{                   

"line": "C/O    

Sandipan Kshirsagar    

Ambejogai Road Renuka    

Nagar Latur",    

                "district": __null__,    

                "state": __null__,    

                "pincode": __null__    

            \}    

    

            "phoneNumber":    

"9876543210"    

        \}    

    \}    

   

   

__Request Body __   

__ __   

Request Body:

__ __

  

 

 

 

   \{    

    "intent": "PROFILE\_SHARE",    

    "metaData": \{    

        "hipId": "MAYUR\_HIP",    

        "context": "ABC123",    

        "hprId": "abdulkalam@abdm",    

        "latitude": "\-38\.679",    

        "longitude": "58\.498"    

    \},    

    "profile": \{    

        "patient": \{    

            "abhaNumber": 91178386101251,    

            "abhaAddress": "9117838@sbx",    

            "name": "User 1",    

            "gender": "M",    

            "dayOfBirth": "10",    

            "monthOfBirth": "10",    

            "yearOfBirth": "1994",    

            "address": \{    

                "line": "C/O Sandipan Kshirsagar Ambejogai Road Renuka Nagar",    

                "district": __null__,    

                "state": __null__,    

                "pincode": __null__    

            \},    

            "phoneNumber": "9876543210"    

        \}    

    \}    

\}    

__ __   

__Response __   

Response:__ __   

Code: 202 ACCEPTED    

__ __ __ __   

### <a id="_Toc376314"></a>7\.3\.2 Profile share – Callback    

    

This is a callback API for patient share API\.    

    

__URL:__ \{callback\_url\}/api/v3/hip/patient/share   

__Method:__ Post   

__Request Headers: __   

__ __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-   

479d\-ad717a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-   

06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds__ __    

X\-HIP\-ID    

IN2810014366    

Yes    

Identifier of the health information provider to which the request was intended    

__ __   

__Body parameters __   

__ __   

Property Name    

Example Value    

Required    

Description    

intent    

PROFILE\_SHARE    

Yes    

This is a key value pair which contains the purpose with following possible values\.    Profile\_share    

 Payment    

 Health\_record\_sharing    

metaData    

"metaData": \{    

        "hipId": "MAYUR\_HIP",    

        "context": "ABC123",    

Yes    

This is a key value pair which contains the location longitude and latitude    

   

        "hprId":    

"abdulkalam@abdm",    

        "latitude": "\-38\.679",    

        "longitude": "58\.498"    

    \}    

   

   

profile    

    "profile": \{    

        "patient": \{    

            "abhaNumber":   

91178386176531,    

            "abhaAddress":   

"91178386@sbx",    

            "name": "User 1",    

            "gender": "M",    

            "dayOfBirth": "10",    

            "monthOfBirth": "10",    

            "yearOfBirth": "1994",              

"address": \{    

                "line": "C/O Sandipan    

Kshirsagar Ambejogai Road",    

                "district": __null__,    

                "state": __null__,    

                "pincode": __null__    

            \},    

            "phoneNumber":    

"9876543210"    

        \}    

Yes    

 

This is key value pair which contains all the patient details    

__ __   

__Request Body __   

__ __   

Request Body:__ __   

\{    

    "intent": "PROFILE\_SHARE",    

    "metaData": \{    

        "hipId": "MAYUR\_HIP",    

        "context": "ABC123",    

        "hprId": "abdulkalam@abdm",    

        "latitude": "\-38\.679",    

        "longitude": "58\.498"    

    \},    

    "profile": \{    

        "patient": \{    

            "abhaNumber": 9117838615XXXX,    

            "abhaAddress": "91178XXXX@sbx",    

            "name": "User 1",    

            "gender": "M",    

            "dayOfBirth": "XX",    

            "monthOfBirth": "XX",    

            "yearOfBirth": "XXXX",              "address": \{    

                "line": "C/O Sandipan Kshirsagar Ambejogai Road Renuka Nagar",    

                "district": __null__,    

                "state": __null__,    

                "pincode": __null__    

            \},    

            "phoneNumber": "987654XXXX"    

        \}      \} \}    

__ __   

__ __   

__ __   

__ __   

__Response __   

__ __   

Response:__ __   

Response: In call back url below details should be displayed as per the Xauth token    

    

\{"intent":"PROFILE\_SHARE","metaData":\{"hipId":"MAYUR\_HIP","context":"6","hprId":"abdulkal am@hpr\.abdm","latitude":"\-   

38\.670","longitude":"58\.498"\},"profile":\{"patient":\{"abhaNumber":"91178386156891","abhaAddr ess":"911783XX@sbx","name":"User 1",    

"gender":"M","dayOfBirth":"XX","monthOfBirth":"XX","yearOfBirth":"XXXX","address":\{"line":null  

,"district":null,"state":null,"pincode":null\},"phoneNumber":"987654XXXX"\}\}\}    

Code: 200 OK    

    

[image removed - see original document]    

    

    

### <a id="_Toc376315"></a>7\.3\.3 Profile on\-share    

This API will be invoked by HIP to acknowledge the request by the user/patient to share the profile details\.    

    

__URL:__ /api/hiecm/patient\-share/v3/on\-share    

__Method:__ Post    

__Request Headers: __   

__ __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction    

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds__ __    

Authorization    

eyJhbGciOiJSUzUxMiJ9\.    

eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc   

2F2    

YW5Ac2J4IiwiY2xpZW50SWQiOiJz    

YngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJy    

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiL    

CJwaHJNb2JpbGUiOm51bGwsImV4c    

CI6MTY2NzI5ODExNSwia    

WF0IjoxNjY3MjkwOTE1LCJwaHJBZ    

GRyZXNzIjoidmFzYW50aGFrdW1hci5rZX    

NhdmFuQHNieCIsInR4bklkIjoi    

YjEwMGM4ZDMtNTE1ZC00YWFiLTg1O    

WQtYzNlMTUwOTE3ZGY1In0    

Yes    

JWT Access token which was issued by ABDM session API after successful validation of client id and secret    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

__ __   

__Body Parameters __   

__ __   

Property    

Name    

Example Value    

Required    

Description    

abhaAddress    

ABHA address    

Yes    

Patient ABHA address against which the health records needs to be linked    

status    

“SUCCESS”    

Yes    

Transaction status from HIP to HIECM,     

“success”    

“failed”     

context    

43    

Yes    

HMIS/LMIS Counter ID    

tokenNumber    

3    

Yes    

Token number at HMIS/LMIS to be provided to the patient    

expiry    

180    

Yes    

Patient year of birth    

requestId    

f29f0e59\-8388\- 

46989fe605db67aeac46    

Yes    

This is a key value pair which contains the purpose    

__ __   

__Request Body __   

__ __   

Request Body:__ __   

\{    

    "acknowledgement": \{    

        "abhaAddress": "abc@abdm",    

        "status": "success",    

        "profile": \{    

            "context": "43",    

            "tokenNumber": "3",    

            "expiry": "180"    

        \}    

    \},    

    "response": \{    

        "requestId": "f29f0e59\-8388\-4698\-9fe6\-05db67aeac46"    

    \}   \}    

__ __   

__Response __   

__ __   

Response:__ __   

Code : 200 OK    

    

__Request Body  : ERROR __  

__\-> __Use this in case of error response \(Ex: This is the one example for error payload and the code will be same\. But, message will be change each error\)\.   

   

   

__ __   

Request Body:__ __   

__\{ __  

__  "error": \{ __  

__    "code": "ABDM\-9999: ", __  

__    "message": "string __  

__  \}, __  

__  "response": \{ __  

__    "requestId": "6f0b4665\-a915\-4c92\-aa36\-65afb4a2cd71" __  

__  \} __ __\} __   

   

### <a id="_Toc376316"></a>7\.3\.4 Profile on share – Callback    

    

This is a callback API for patient on\-share API\.    

    

__URL:__ \{callback\_url\}/api/v3/hiu/patient/on\-share  

 __Method:__ Post   

__Request Headers: __   

__ __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-   

479d\-ad717a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-   

06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds__ __    

X\-HIU\-ID    

ABDM\_sbx    

Yes    

Suffix of the HIU to which the request was intended    

__Body Parameters: __   

__ __   

Property Name    

Example Value    

Required    

Description    

abhaAddress    

ABHA address    

Yes    

Patient ABHA address against which the health records needs to be linked    

Status    

“success”    

Yes    

Trasaction status from HIP to HIE\-CM,     

“success”    

“failed”     

Context    

43    

Yes    

HMIS/LMIS Counter ID    

tokenNumber    

3    

Yes    

Token number at HMIS/LMIS to be provided to the patient    

Expiry    

180    

Yes    

Patient year of birth    

requestId    

f29f0e59\-8388\- 

46989fe605db67aeac46    

Yes    

This is a key value pair which contains the purpose    

__ __   

__Request Body __   

__ __   

[image removed - see original document] 

__ __   

__Response __   

__ __   

Response:__ __   

Code: 200 OK    

[image removed - see original document]    

   

# <a id="_Toc376317"></a>8\.API Listing    

   

__No__\.  

  	__Flow__    

__Serial__   

__v3 API__    

__Description__    

__1 __   

__HIP initiated linking __   

1\.1    

/api/hiecm/v3/token/gene rate\-token    

This generic API endpoint will be used to generate a linking token to link care context\.    

__ __

__ __   

1\.2    

\{callback\_url\}/api/v3/hip/token/ongeneratetoken

This is a Call\-back API for hiecm/api/v3 /token/generatetoken 

 

__ __

__ __   

1\.3    

/api/hiecm/hip/v3/link/car econtext    

This API needs to be called by the HIP to link the care context against the patient ABHA address, once the HIP has the valid linking token generated against the same patient ABHA address\.    

__ __

__ __   

1\.4    

\{callback\_url\}/api/v3/link/ on\_carecontext    

This is a Call\-back API for hiecm/api/v3 /link/carecontext    

This API will be invoked to get all the linked health records of the patient\.   

__ __

__ __   

1\.5    

/api/hiecm/hip/v3/link/pat ient/links    

__ __

__ __   

1\.6    

/api/hiecm/hip/v3/link/co ntext/notify    

This API will be invoked by HIP after updating a health record to notify all the subscribed HIUs\.    

__ __

__ __   

1\.7    

\{callbackURL\}/api/v3/links/ context/onnotify  

This is a callback api for    

/hiecm/api/v3/link/context/notify  API\.      

__ __

__ __   

1\.8    

/api/hiecm/hip/v3/link/pat ient/links/sms/notify2    

This API will be invoked by HIP to trigger a SMS notification to the patient mobile number\.    

__ __

__ __   

1\.9    

\{callbackURL\}/api/v3/patie nts/sms/onnotify  

This is a callback API for    

/hiecm/api/v3/link/patient/links/ sms/notify2 API call\.    

  

__ __

__ __   

1\.10    

/api/hiecm/hip/v3/link/pat ient/links/hip/ondeactivate    

This API will be invoked by HIP as a response on deactivating an abha address\.    

__ __

__ __   

1\.11    

/api/hiecm/hip/v3/link/pat ient/links/hiu/ondeactivate    

This API will be invoked by HIU as a response on deactivating an abha address\.    

__2 __   

__User initiated linking__    

2\.1    

/api/hiecm/userinitiated\-  linking/v3/patient/carecontext/discover  

This API will be invoked by the  __patient/user__  	 from the PHR application to discover his/her health records\.    

    

    

2\.2    

\{callback\_url\}/api/v3/hi p/patient/carecontext/discover    

This API will be invoked by the __HIE\-CM__ to discover patient health records from   

HIP\.    

   

  

    

2\.3   

/api/hiecm/userinitiatedlinking/v3/patient/carecontext/ondiscover

 

 This API will be invoked by the __HMIS/LIMS __ __application__  

sharing 

response for  of the 

discover API\.    the  

    

2\.4   

\{callback\_url\}/api/v3/hi u/patient/carecontext/on\-discover    

 

This API will be invoked by the __HIECM__ 

for sharing the response of the discover API\.    

    

2\.5   

/api/hiecm/userinitiated\- linking/v3/link/carecontext/init    

 

This is an API that will be invoked by the __patient/user__ to link his/her health records\.    

    

2\.6   

 \{callback\_url\}/api/v3/hi p/link/care\-context/init    

This API will be invoked by the __HIECM__ to link patient/user health records to HIP\.  

    

2\.7   

/api/hiecm/userinitiatedlinking/v3/link/carecontext/on\-init    

 

This is an API that will be invoked by the __HIP__ to share the response of the init API\.    

    

2\.8   

 \{callback\_url\}/api/v3/hi u/patient/carecontext/on\-init    

This is an API that will be invoked by the 

__HIECM__ to share the response of the init   

API with the Patient\.   

    

2\.9   

/api/hiecm/userinitiatedlinking/v3/link/carecontext/confirm    

 

This API will be invoked by the __patient/user__ to confirm his/her health records\.    

    

2\.10   

\{callback\_url\}/api/v3/hi p/link/carecontext/confirm    

This API will be invoked 

by the __HIECM__  to confirm patient/user health records to HIP\.    

    

2\.11   

/api/hiecm/userinitiatedlinking/v3/link/carecontext/onconfirm    

This is an API that will be invoked by the HIP 	to 	share 	the response 	of 	the confirmed  API\.    

  

     

2\.12  

 \{callback\_url\}/api/v3/hi u/patient/carecontext/on\-confirm    

This API will be invoked by the HIECM to share the response of confirm API to the patient\.    

3  

__Patient __  __Share__    

3\.1    

/api/hiecm/patientshare/v3/share    

This API will be invoked from the integrator application  \(any PHR application,   just like    

ABHA\) to share the user/patient profile with HMIS/LIMS\.    

     

3\.2   

\{callback\_url\}/api/v3/hi p/patient/share    

 

Callback API for patient share    

     

3\.3   

 /api/hiecm/patientshare/v3/on\-share    

This API will be invoked by HIP to acknowledge the request by the user/patient to share the profile details\.    

     

3\.4   

\{callback\_url\}/api/v3/hi u/patient/on\-share    

 

Callback for Patient on\-share    

__4 __ 

 __Session __   

4\.1   

/api/hiecm/gateway/v3    /sessions    

API to generate Auth token    

__5 __ 

 __Gateway __   

5\.1   

/api/hiecm/gateway/v3    /bridge/url    

API to update the bridge URL    

__  __   

5\.2   

/api/hiecm/gateway/v3    /certs    

API to get keys from keycloak    

__  __   

5\.3   

/api/hiecm/gateway/v3 /\.well\-known/openidconfiguration    

 

API to get OpenID configuration    

__  __   

5\.4   

/api/hiecm/gateway/v3   

/bridge\-  service/serviceId/\{servic eId\}    

 

API to fetch bridge details by service id    

__  __   

5\.5   

/api/hiecm/gateway/v3   

/bridge\-services    

 

API to fetch all the service details from a bridge    

__6 __ 

__Data __  __Flow __   

6\.1   

 /api/hiecm/consent/v3/ request/hip/on\-notify    

API will be called by HIP to acknowledge the consent approval   

__  __   

6\.2   

/api/hiecm/dataflow/v3/healthinformation/hip/onrequest    

 

API will be called by 	HIP 	to acknowledge 

data flow  request    

__ __   

6\.3   

/api\- hiu/data/notification    

Data transfer API to push data    

__ __   

6\.4   

/api/hiecm/dataflow/v3/healthinformation/notify    

API called by HIP/HIU to notify the status of data transfer    

   

# <a id="_Toc376318"></a>9\.Error Codes Listing    

__Code __   

__Error __   

ABDM\-1000__ __   

Unable to connect the database__ __   

ABDM\-1001__ __   

No data found__ __   

ABDM\-1002__ __   

Integrity violation__ __   

ABDM\-1003__ __   

Email Gateway is unavailable__ __   

ABDM\-1004__ __   

SMS Gateway is unavailable__ __   

ABDM\-1005__ __   

Invalid receiver__ __   

   

ABDM\-1006__ __   

Bad Request,  invalid request Body__ __   

ABDM\-1007__ __   

Connection failed due to timeout__ __   

ABDM\-1008__ __   

SMS service currently disabled __ __   

ABDM\-1009__ __   

Email service currently disabled__ __   

ABDM\-1010__ __   

Validation failed__ __   

ABDM\-1011__ __   

Gateway database unavailable__ __   

ABDM\-1012__ __   

No records found against the ABHA Address__ __   

ABDM\-1013__ __   

Invalid ABHA Number__ __   

ABDM\-1014__ __   

Invalid Mobile Email__ __   

ABDM\-1015__ __   

Invalid Response__ __   

ABDM\-1016__ __   

Invalid TimeStamp__ __   

ABDM\-1017__ __   

Invalid TransactionId__ __   

ABDM\-1018__ __   

Share Profile database unavailable__ __   

ABDM\-1019__ __   

Dependent Service Unavailable__ __   

ABDM\-1020__ __   

Unknown database__ __   

ABDM\-1021__ __   

Lack of required priviledges__ __   

ABDM\-1022__ __   

Too many requests__ __   

ABDM\-1023__ __   

Invalid User__ __   

ABDM\-1024__ __   

Dependent service unavailable__ __   

ABDM\-1025__ __   

Invalid ServiceId__ __   

ABDM\-1026__ __   

Invalid Link Token__ __   

ABDM\-1027__ __   

You are blocked\. Please try again after 24 hours\.__ __   

ABDM\-1028__ __   

HIP is unavailable__ __   

ABDM\-1029__ __   

Redis server is unavailable__ __   

ABDM\-1030__ __   

Invalid request ID__ __   

ABDM\-1031__ __   

Invalid request__ __   

ABDM\-1032__ __   

Invalid header__ __   

ABDM\-1033__ __   

HIU is unavailable__ __   

  

ABDM\-1034__ __   

Notification service unavailable__ __   

ABDM\-1035__ __   

Invalid HIP ID__ __   

ABDM\-1035__ __   

OTP does not matched__ __   

ABDM\-1036__ __   

Data does not matched__ __   

ABDM\-1037__ __   

Counter and Care context count mismatch__ __   

ABDM\-1038__ __   

ABHA address and Link token mismatch__ __   

ABDM\-1039__ __   

Invalid Consent request id__ __   

ABDM\-1040__ __   

Invalid HIU ID__ __   

ABDM\-1041__ __   

Invalid Acknowledgement__ __   

ABDM\-1042__ __   

Provider Mandatory__ __   

ABDM\-1043__ __   

ABHA Address does not match with KYC details\.__ __   

ABDM\-1044__ __   

Broadcast Failed__ __   

ABDM\-1045__ __   

Database Access is restricted__ __   

ABDM\-1046__ __   

Invalid Purpose__ __   

ABDM\-1047__ __   

Purpose does not exist__ __   

ABDM\-1048__ __   

Timeout__ __   

ABDM\-1049__ __   

Invalid Profile Share Intent Keys__ __   

ABDM\-1050__ __   

Invalid Profile Share Metadata Keys__ __   

ABDM\-1051__ __   

Invalid ABHA Number or ABHA Address__ __   

ABDM\-1052__ __   

Invalid TransactionId or response's requestId__ __   

ABDM\-1053__ __   

Data already exists__ __   

ABDM\-1054__ __   

Invalid Subscription Request Id__ __   

ABDM\-1401__ __   

HIP is not available__ __   

ABDM\-1402__ __   

Acknowledgement is not received from HIP__ __   

ABDM\-9999__ __   

Unknown exception__ __   

ABDM\-1061__ __   

Consent artefact expired__ __   

ABDM\-1062__ __   

Consent Not granted__ __   

ABDM\-1063__ __   

Date Range given is invalid__ __   

ABDM\-1064__ __   

request with this request id already exists__ __   

ABDM\-1017     

Invalid TransactionId     

ABDM\-1109     

ABHA DB service unavailable     

ABDM\-1108     

Notification DB service unavailable     

ABDM\-1205     

Document DB Gateway is unavailable     

ABDM\-1034     

Notification service unavailable     

ABDM\-1029     

Redis server is unavailable     

ABDM\-1202     

Document Gateway is unavailable     

ABDM\-1200     

LGD Gateway is unavailable     

ABDM\-1201     

IDP Gateway is unavailable     

ABDM\-9999     

Unknown exception     

ABDM\-1101     

This ABHA Address already exists\. Please create with unique ABHA Address     

ABDM\-1006     

Invalid combinations of scopes     

ABDM\-1100     

You have requested multiple OTPs Or Exceeded  maximum number of attempts for OTP match in this transaction\. Please try again in 30 minutes\.     

ABDM\-1006     

Bad Request, invalid request Body     

__ __   


