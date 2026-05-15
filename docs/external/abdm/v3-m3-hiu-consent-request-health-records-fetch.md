# M3 - HIU (Consent Request, Health Records Fetch)

> Source: ABDM Sandbox V3 Documentation
> File: M3_Dcoument_16_02_2026_2319bac7bf.docx

SANDBOX DOCUMENTATION    

\(ABDM\_Milestone 3\)    

Version 2\.6  

Updated on 13\.02\.2026  

Contents  

[1	Base URL and X\-CM\-ID	3](#_Toc213410229)

[1\.1	IP Address whitelisting for call\-back\.	3](#_Toc213410230)

[2	Terminology Definition:	3](#_Toc213410231)

[3	Gateway flow	3](#_Toc213410232)

[3\.1	Overview	3](#_Toc213410233)

[3\.2	API Information Request & Response	4](#_Toc213410234)

[3\.2\.1	Auth token API	4](#_Toc213410235)

[3\.2\.2	OpenID Configuration API	6](#_Toc213410236)

[3\.2\.3	OAuth Certificate API	7](#_Toc213410237)

[3\.2\.4	Update bridge URL API	11](#_Toc213410238)

[3\.2\.5	Registration of Facility & Software Linkage	12](#_Toc213410239)

[3\.2\.6	Find bridge by service id	15](#_Toc213410240)

[3\.2\.7	Find services by bridge id	17](#_Toc213410241)

[4	Consent flow	20](#_Toc213410242)

[4\.1	Overview	20](#_Toc213410243)

[4\.2	Sequence Diagram	22](#_Toc213410244)

[4\.3	API Information Request & Response	23](#_Toc213410245)

[4\.3\.1	HIE\-CM \- Consent request init	23](#_Toc213410246)

[4\.3\.2	HIE\-CM\- Consent request init \- call back	57](#_Toc213410247)

[4\.3\.3	HIE\-CM\- Callback API to HIU when a consent request is APPROVED/REVOKED/DENIED	59](#_Toc213410248)

[4\.3\.4	HIE\-CM – API for HIU to respond back to consent HIU callback	61](#_Toc213410249)

[4\.3\.5	HIE\-CM\- Consent request status	64](#_Toc213410250)

[4\.3\.6	HIE\-CM \- Consent request on\-status \(Callback\)	68](#_Toc213410251)

[4\.3\.7	HIE\-CM \- Consent request fetch	70](#_Toc213410252)

[4\.3\.8	HIE\-CM \- Consent request on\-fetch \(callback\)	74](#_Toc213410253)

[5	Data flow	81](#_Toc213410254)

[5\.1	Overview	81](#_Toc213410255)

[5\.2	Sequence Diagram	82](#_Toc213410256)

[5\.3	API Information Request & Response	82](#_Toc213410257)

[5\.3\.1	Data flow – Data request invoked by HIU	82](#_Toc213410258)

[5\.3\.2	Data flow – call back to HIU	86](#_Toc213410259)

[5\.3\.3	Notify	88](#_Toc213410260)

[6	Subscription flow	91](#_Toc213410261)

[6\.1	Overview	91](#_Toc213410262)

[6\.2	Sequence Diagram	92](#_Toc213410263)

[6\.3	API Information Request & Response	93](#_Toc213410264)

[6\.3\.1	Users get subscription requests	93](#_Toc213410265)

[6\.3\.2	User subscription request initiate	96](#_Toc213410266)

[6\.3\.3	User Subscription request initiate – Call Back	98](#_Toc213410267)

[6\.3\.4	Approve Subscription Request	100](#_Toc213410268)

[6\.3\.5	Approve Subscription – Call back	105](#_Toc213410269)

[6\.3\.6	Subscription Request Hiu – on notify	108](#_Toc213410270)

[6\.3\.7	Deny Subscription Request	109](#_Toc213410271)

[6\.3\.8	Deny Subscription – Call Back	111](#_Toc213410272)

[6\.3\.9	Edit Subscription	113](#_Toc213410273)

[6\.3\.10	Edit Subscription – call back	118](#_Toc213410274)

[6\.3\.11	Subscription HIU –notify	120](#_Toc213410275)

[6\.3\.12	Subscription HIU –On\-notify	124](#_Toc213410276)

[7	API listing	125](#_Toc213410277)

 

  

  

  

  

  

  

  

  

  

  

  

  

# <a id="_Toc213410229"></a>Base URL and X\-CM\-ID__ __   

Environment    

Base URL    

X\-CM\-ID    

Sandbox    

https://dev\.abdm\.gov\.in    

sbx    

Production    

https://apis\.abdm\.gov\.in    

abdm    

__ __     


## <a id="_Toc213404727"></a><a id="_Toc213410230"></a>IP Address whitelisting for call\-back\.    

Environment     

NAT IPs:

Sandbox     

13\.203\.243\.253

13\.203\.245\.166

65\.0\.113\.207

Production

13\.203\.243\.253

13\.203\.245\.166

65\.0\.113\.207

# <a id="_Toc213410231"></a>Terminology Definition:__ __   

__Bridge ID:__ Is client ID which provided by NHA to HIP \(Its alphanumerical eg: SBX\_00XXXX\)    

__Service ID:__ Is Facility ID which is generated from NHPR application \(Its alphanumeric eg:  

IN02100000XX\)    

# <a id="_Toc213410232"></a>Gateway flow    

## <a id="_Toc213410233"></a>Overview    

This is the key ABDM building block that manages ABHA addresses, maintains links to health data for each ABHA address and manages consents provided by the user for sharing of their health data\. It also supports exchange of interoperable health data between HIPs and HIUs\.    

The HIE\-CM enables exchange of personal health data with consent as per the Health Data Management Policy issued by NHA\.    

## <a id="_Toc213410234"></a>API Information Request & Response    

### <a id="_Toc213410235"></a>Auth token API         	    	    	    	    	    

This API will be invoked to generate auth token\.    

__URL:__ /api/hiecm/gateway/v3/sessions   

__Request:__ POST    

__ __   

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

  

Request Body    

\{    	  

    "clientId": "SBX\_XXXXX",    

    "clientSecret": "XXXX\-XXX\-XXXX\-XXXX\-XXXXXXX",    

    "grantType": "client\_credentials"    

\}    

__ __   

__ __   

__Response: __   

Response    

Code : 202 Accepted     

	\{    	 

    "accessToken":   

"eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJBbFJiNVdDbThUbTlFSl9JZk85ejA2ajlvQ3Y1MXBLS 0ZrbkdiX1RCdkswIn0\.eyJleHAiOjE3MjMyMjU3MTEsImlhdCI6MTcyMzIyNDUxMSwianRpIjoiMzE3MjVkN2Qt 

NmM1Mi00OWE0LTk0M2MtZmY2ZjhkNjNhYmRlIiwiaXNzIjoiaHR0cHM6Ly9kZXYubmRobS5nb3YuaW4vYX   

V0aC9yZWFsbXMvY2VudHJhbC1yZWdpc3RyeSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJjN2NhMjk3Yi0yZTVh   

LTRkN2UtOGY5YS0xYWU2NDAxYWQ0Y2YiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJTQlhfMDAwMTM1Iiwic2Vzc 2lvbl9zdGF0ZSI6IjhiYjQ4ZGM5LTJmMDUtNDA0OC05MGUxLWRjYjgxNWRmOGU5MyIsImFjciI6IjEiLCJhbGx vd2VkLW9yaWdpbnMiOlsiaHR0cDovL2xvY2FsaG9zdDo5MDA3Il0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6W  

yJIaWRJbnRlZ3JhdGVkUHJvZ3JhbSIsIkhJVV9QQVlFUiIsImhmciIsImhpdSIsIm9mZmxpbmVfYWNjZXNzIi wiaGVhbHRoSWQiLCJwaHIiLCJPSURDIiwiaGVhbHRoX2xvY2tlciIsImhpcCIsImhwX2lkIl19LCJyZXNvdXJjZV 9hY2Nlc3MiOnsiU0JYXzAwMDEzNSI6eyJyb2xlcyI6WyJ1bWFfcHJvdGVjdGlvbiJdfSwiYWNjb3VudCI6eyJy b2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19f Swic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsImNsaWVudEhvc3QiOiIxMDAuNjUuMTYwLjIxNCI sImNsaWVudElkIjoiU0JYXzAwMDEzNSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicHJlZmVycmVkX3VzZXJ uYW1lIjoic2VydmljZS1hY2NvdW50LXNieF8wMDAxMzUiLCJjbGllbnRBZGRyZXNzIjoiMTAwLjY1LjE2MC4yMTQi  

fQ\.L56AYZYfzFrO\_gNedAbSwR9foEO661z2cMGEeOKsz2ZXsIpTb9oLd9fmRiixIS7ToGoW2VzzXC14qrXnwZIqknBZchTRJrmyGk 

6iRJN QYR4k12hrn4tbdW\- h5e9m4NWFAvPtGbBUyKA8gotrne9fn7T0MOC7N\_J8TS3JLr2gothJSgc9P3VDKm8c6zpAObQPmwEpH qJH6j2Q07nGsoaBygxovoIeFn6G6zwIa\-\_mKw\_a86L\_CYxr8Gxw5\-   

5PXkh2XwYp\_xLIiJ3t7vLM97UFThwSn\_TmRF6W1LH145m\_6NxY4hQclHi1elK3OP4LvR1SLDwtAQZSCm4Jpihd0uMw",    

    "expiresIn": 1200,      "refreshExpiresIn": 1800,    

    "refreshToken":    

"eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIyMWU5NzA4OS00ZTcxLTQyNGEtOTAzYS1jOTAyMW  M1NmFlNWYifQ\.eyJleHAiOjE3MjMyMjYzMTEsImlhdCI6MTcyMzIyNDUxMSwianRpIjoiZGY5ODdmYzQtYzdk  Ni00OGNmLTliM2EtNzRmNWVkMTljMmNmIiwiaXNzIjoiaHR0cHM6Ly9kZXYubmRobS5nb3YuaW4vYXV0a C9yZWFsbXMvY2VudHJhbC1yZWdpc3RyeSIsImF1ZCI6Imh0dHBzOi8vZGV2Lm5kaG0uZ292LmluL2F1dGg vcmVhbG1zL2NlbnRyYWwtcmVnaXN0cnkiLCJzdWIiOiJjN2NhMjk3Yi0yZTVhLTRkN2UtOGY5YS0xYWU2ND AxYWQ0Y2YiLCJ0eXAiOiJSZWZyZXNoIiwiYXpwIjoiU0JYXzAwMDEzNSIsInNlc3Npb25fc3RhdGUiOiI4YmI0O GRjOS0yZjA1LTQwNDgtOTBlMS1kY2I4MTVkZjhlOTMiLCJzY29wZSI6Im9wZW5pZCBlbWFpbCBwcm9maWx lIn0\.\_cOnTXMf2bObS1nySL\-AjvM5PQxgCHJRm2oO66nrx1M",    

    "tokenType": "bearer"    

\}    

__ __   

### <a id="_Toc213410236"></a>OpenID Configuration API     	    	    	    	    	    	    

Openid\-configuration API, defined within OpenID Connect which provides configuration information about the Identity Provider \(IDP\)\.    

__URL:__ /api/hiecm/gateway/v3/\.well\-known/openid\-configuration 

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

Unique UUID for tracking the endto\-end request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

Sbx    

Yes     

Suffix of the consent manager to which the request was intended\.    

__Response: __   

Response    

Code : 202 OK    

\{    

    "jwks\_uri": "https://dev\.abdm\.gov\.in/api/hiecm/gateway/v3/certs"    

\}    

    

### <a id="_Toc213410237"></a>OAuth Certificate API    	    	    	    	    	    	    	    

This API provide an OAuth certificate that can be used to validate which received gateway session token in Header on the call back\.    

__URL:__ /api/hiecm/gateway/v3/certs    

__Request:__ GET    

__ __     

__ __   

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

Unique UUID for tracking the endtoend request transaction     

TIMESTAMP     

2022\-10\-06T10:10:00\.587Z     

Yes     

The actual time when the request was initiated, ISO Date time format represents the date and time    

X\-CM\-ID     

Sbx    

Yes     

Suffix of the consent manager to which the request was intended\.    

__Response: __   

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

5XkfwiqvOBaybK6\_BCBPuTqWMUEuUklLYXu2X7ESHdVNFMFAjxCcCXUtP7LFdvT3nnFekRmG82QbSQSVe   

4N5tPH8q0MCxSWWn2c15bDnzOF\-dvfRCVPRabCzw0M\-utHR9diTrWtq6Koi5buxgwM1rbk0p8Q",    

            "use": "sig",    

            "x5c": \[    

                   

"MIICrzCCAZcCBgFy/3WZBjANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBjZW50cmFsLXJlZ2lzdHJ5  

MB4XDTIwMDYyOTA5NDEzNloXDTMwMDYyOTA5NDMxNlowGzEZMBcGA1UEAwwQY2VudHJhbC1yZWdpc   

3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJoJlu1uWRhfxuXCXr8GIvB4j3CPuqkv6b J2cWuL925MAJMjqDnfPupHraziPmQNj20Wxp8RX2R4iPeK3RVyeEPWpqbHLM/TaHEyDzD5lsnSfAOdKWW mFsopGA0iYg5bau4t1rKTykjrkB6wuYfXTHAlb3l\+aHoNLTuvGe/YMA5aXMYqg2xWqYbKg78fuV5H8Iqrzg WsmyuvwQgT7k6ljFBLlJJS2F7tl\+xEh3VTRTBQI8QnAl1LT\+yxXb0955xXpEZhvNkG0kElXuDebTx/KtDAsUllp9 nNeWw58zhfnb30QlT0Wmws8NDPrrR0fXYk61rauiqIuW7sYMDNa25NKfECAwEAATANBgkqhkiG9w0BAQs   

   

  

FAAOCAQEACkC3TijrXIgi4vn\+l1uL1nfdK6vOIL5UZ6yCjSOq7zYW6b3Qe8j7NrPb9RJC\+pbIERyNbB\+t9hsa5 g1L7lkjCNlUuxfJprsJ9LJKlM5g7dYEA6XPCJ7C6AVlarj72vlWXQvwjnQMO2/CM9/Jp5Hnv2Qwjn7NME2OW  M0iblc/TD\+DEZK5L5mlWMyuBSQo2o/AcOmfG4MoE5Gm/CaOJ47rSrf\+lq83e5\+dyKh7uLVAa\+5WK8Im   

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

"jDOehgMzurNQT0WJCTWN6a34639uIKOLO1LnXZes\_kTakWh6iRxmkExLLCD7MJjz9aijTHwIuKAtOCSbFO pwbqSfF6dMBS2c8cv0AU3pE8kSM

BuUriwr9BUYSUW8SM68QH\_HCaz2mmN\_Z8ynTQ4kWw\_Idj\-  enVpkHYtq00DriG98l6RXF1Ao9Kd16ctoNbthuQYH0RSRIXnt0Qtm4GSAY7abPCNa64mir0auldU72DJHXwDo6g5OGz6EMm86ZAV\_pvh\_5YzFpfk IMxv0yMMKFZjkFGA0QKYMkMTC5ruLaE7cec\-njA7dJQnQ",    

            "use": "sig",    

            "x5c": \[    

                   

"MIICrzCCAZcCBgGHxvQVmDANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBjZW50cmFsLXJlZ2lzdHJ   5MB4XDTIzMDQyODA4MTk1N1oXDTMzMDQyODA4MjEzN1owGzEZMBcGA1UEAwwQY2VudHJhbC1yZWdpc  

3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIwznoYDM7qzUE9FiQk1jemt\+Ot/biCjiztS   

512XrP5E2pFoeokcZpBMSywg\+zCY8/Woo0x8CLigLTgkmxTqcG6knxenTAUtnPHL9AFN6RPJEjKRiSg2fXYg PgblK4sK/QVGElFvPkjOvEB/xwms9ppjf2fMp00OJFsPyHY/np1aZB2LatNA64hvfJekVxdQKPSndenLaDW7Y bkGB9EUkSF57dELZuBkgGO2mzwjWuuJoq9PmrpXVPu9gyR18A6OoOThs\+hDJvOmQFf6b4f\+WMxaX5FA PEytixVQJgt1KfiDMb9MjDChWY5BRgNECmDJDEwua7i2hO3HnPp4wO3SUJ0CAwEAATANBgkqhkiG9w0B   

AQsFAAOCAQEABYAcXOSr\+WgOxKVmygID9WjB4rDuAVDyU3GmjBvckdWhYJuBX8Vs04hNVNgf904gqy  

\+D5wZIQU985stK3PdogFGN2jVw2kO9G3hG4/7uwYKqciKApT/pSPMeHRltHGp/Mwr6e5poVwgQyrn\+Be   

H373U1Q6eB1QUYnElP\+16y7bbvQhfDAS2X9sqdfurB9YIL5xZMPddZaf7pPX8oWOVlB0XH1JEZfsX125qq0Xn  

K8z/Rd8KI8zTfJw6D2Kzrk1WvQSlM5KnTQmcSk3kwDlW5Dg657dT49Y68mI4azq34q17JgBhTx3IbTuf94QT w7QC5wmFtO\+hc6zPVODX8JWu7

 	 

__ __   

### <a id="_Toc213410238"></a>Update bridge URL API        

This API will be called to update the bridge base URL\.    

[image removed - see original document]__URL:__ /api/hiecm/gateway/v3/bridge/url __Request:__ PATCH  __Header Parameters:__    

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

Response    

Code : 202 Accepted    

__ __   

### <a id="_Toc213410239"></a>Registration of Facility & Software Linkage    

__Overview:__ The software being used by the provider must integrate with the digital building blocks of ABDM and comply with the guidelines outlined NHA\. NHA maintains the national directory of all healthcare facilities\. Any participating facility needs to sign up in the health facility registry at \(nhpr\.abdm\.gov\.in\) This ensures that they are a valid facility which is authorized to issue health records in the ecosystem\. HFR consists of information for each healthcare facility in the country – hospitals, clinics, diagnostic centers, pharmacies etc\., across all systems of medicine and covering both public and private health facilities\. HFR offers APIs that can be used by various stakeholders in the ecosystem\. Healthcare information service provider application or healthcare repository provider application must be upgraded to become ABDM compliant\.      

__Registration of facility: __   

__Through website__: https://hspsbx\.abdm\.gov\.in/home \(sandbox\), https://nhpr\.abdm\.gov\.in/home \(production\)  __Step\-by\-step user manual document access:  __   

Goto: https://hspsbx\.abdm\.gov\.in/home \(sandbox\) , https://nhpr\.abdm\.gov\.in/home \(production\)    

>>Resource center >> User Manual    

>> Select “For Health Facility” >>Download “User Manual” >>Refer Content    

“A” \(Health Professional ID \(HPID\) creation\), “B” \(Facility Registration\)    

__ __   

__Registration of bridge services \(HIP/HIU\) on facility: __   

__Option 1__: Linking through website: https://hspsbx\.abdm\.gov\.in/home \(sandbox\) , https://nhpr\.abdm\.gov\.in/home \(production\)  __Step\-by\-step user manual document access:  __   

Goto: https://hspsbx\.abdm\.gov\.in/home \(sandbox\) , https://nhpr\.abdm\.gov\.in/home \( production\)   

>>Resource center >> User Manual    

>> Select “For Health Facility” >>Download “User Manual” >>Refer Content “C” \(Software   

Linkage\)    

__Option 2: Through API __   

This API \( [https://apihspsbx\.abdm\.gov\.in/v4/int/v1/bridges/MutipleHRPAddUpdateServices](https://apihspsbx.abdm.gov.in/v4/int/v1/bridges/MutipleHRPAddUpdateServices) \)   


will be used to link multiple bridges against a facility\. It will accept the facility id , facility name and list 

of HRP i\.e\. bridges\.     

Please note:      

- You must pass in all the required parameters to create the API\.      
- The data needs to be passed in the required format as mentioned for each field\.      

__API can refer swagger link : __ 

[https://apihspsbx\.abdm\.gov\.in/v4/int/swagger\-ui\-ext/index\.html\#/Multiple%20HRP%20API/facilityAddAndUpdate](https://apihspsbx.abdm.gov.in/v4/int/swagger-ui-ext/index.html#/Multiple%20HRP%20API/facilityAddAndUpdate) >>>Go to Multi   

	 	HRP   API   	>>>and   	Select  “/v1/bridges/MutipleHRPAddUpdateServices  

v1MutipleHRPAddUpdateServices”    

    

    

    

__Parameters:  __   

   

__Params__      

__Required__    

__Description__      

__Data __ __type__   

      

__Format if any__      

      

__facilityId__      

Yes      

Will be validated if present in   

HFR or not      

String      

__Starting with IN and of 12 characters__      

__facilityName__      

Yes      

      

Name of the facility to be linked 

String      

Alphanumeric      

__bridgeId__      

      

Yes      

Valid Bridge Id to be linked\.       

String      

Alphanumeric and validity to be checked by HIECM  

__hipName__      

Yes     

• To provide uniqueness against each bridges that is linked  \. HIP name is the name of the  hospital which will reflect    

 String      

        	     

       

    

• HIP name can be the Hospital name added with suffix of bridge name\.    

example     

    

  

  

  

    

  

  

  

on ABHA/PHR app  	  	  when the patent will search for the respective hospital\.     

  	  	  

  	  	  

  	  	  

       

   

  

  

  

Hospital    	nd name=XYZ   

bridge   	nam

=BRIDGE TEST, the HIP name = XY 

BRIDGE\.  • namHIP can not be  more   than    15 characters\., No  	is special    

character    

allowed    

\(%$\*\#@\(~&\!\), an it should be uniqu for every bridge fo 

a  facility     

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

Accept Boolean   

value     

     

### <a id="_Toc213410240"></a>Find bridge by service id    

This API will fetch the bridge details for the given service id\.    

__URL:__ /api/hiecm/gateway/v3/bridge\-service/serviceId/\{serviceId\} __Request:__ GET __Header Parameters:__    

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

__ __   

__Response: __   

  

Response   

 

Code : 200 Ok    

  

\{    

    "id": 1561,    

    "bridgeId": "SBX\_XXXX",       

"serviceId": "TestClinicHIP",    

    "name": "TestClinicHIP",    

    "isHip": __true__,    

    "isHiu": __true__,       

"isPhr": __false__,    

    "endpoints": \{\},    

    "active": __true__,    

    "registerTime": "2021\-03\-01 11:17:35\.1735",    

    "dateCreated": "2021\-03\-01 11:17:35\.1735",    

    "dateModified": "2024\-04\-22 11:04:46\.446"   

\}    

    

### <a id="_Toc213410241"></a>Find services by bridge id    

This API will fetch all the service details for the bridge id from authorization token\.    

__URL:__ /api/hiecm/gateway/v3/bridge\-services    

__Request:__ GET    

__ __   

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

                        "address": "https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/registration"    

                    \},    

                    \{    

                        "use": "data\-upload",    

                        "connectionType": "HTTPS",    

                        "address": "https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/data\-upload"    

                    \}    

                \],    

                "hiuEndpoints": \[    

                    \{    

                        "use": "registration",    

                        "connectionType": "HTTPS",    

                        "address": "https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/registration"    

                    \},    

                    \{    

                        "use": "data\-upload",    

                        "connectionType": "HTTPS",    

                        "address": "https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/data\-upload"    

                    \}    

                \],    

                "healthLockerEndpoints": \[    

                    \{    

                        "use": "registration",    

                        "connectionType": "HTTPS",    

                        "address": "https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/registration"    

                    \},    

                    \{    

                        "use": "data\-upload",    

                        "connectionType": "HTTPS",    

                        "address": "https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/data\-upload"    

                    \}    

                \]    

            \},    

            "active": true    

        \}    

    \]    

\}    

    

# <a id="_Toc213410242"></a>Consent flow    

## <a id="_Toc213410243"></a>Overview    

The service used to handle consent management before sharing the health data between the entities \(HIP, HIU, PHIU\)     

There are a couple of essential attributes required for consent artefact like Purpose, HI Types, Access mode, Requester, Range, and Validity\.    

HIE\-CM will validate HIU requests for authenticity, replay attack, timestamp, ABHA address, etc\. The request will be saved into the database\. The consent request id will be returned to the called HIU for future tracking purposes\.    

The valid requests will be broadcasted to the priority queue and sent to all the ABDM compliance Patient HIU \(PHR application\)\. The consent notification status will be saved into the database\.    

Upon successful acknowledgment, the consent artifact will be generated and saved into the database\. HIECM will further share this consent artefact with HIP and HIU\.    

    	  	 

## <a id="_Toc213410244"></a>Sequence Diagram    

[image removed - see original document]    

    

[image removed - see original document]    

    

## <a id="_Toc213410245"></a>API Information Request & Response    

### <a id="_Toc213410246"></a>HIE\-CM \- Consent request init        	    	    	    	    

This is an API that will be invoked by HIU to initiate a consent request to get data about a patient\.    

While requesting and exchanging health information, there are meta codes that are relevant to you if you are a HIU\.    

•   Purpose of Use \- defines what is the purpose of use of the health information that a HIU is requesting for\. The following are subset from http://terminology\.hl7\.org/ValueSet/v3\-PurposeOfUse    

__Code __   

__Display __   

CAREMGT    

Care Management    

Break the Glass    

Public Health    

Healthcare Payment    

BTG    

PUBHLTH    

HPAYMT    

DSRCH    

Disease Specific Healthcare Research    

Self\-Requested    

PATRQT    

    

__URL:__ /api/hiecm/consent/v3/request/init __Request:__  POST __Header Parameters:__     

Property    

Name    

Example Value    

Required    

Description    

Authorization    

Gateway Session Token    

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

__Actual time when request was initiated, ISO Date time format represents date and __ __time__    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

    

    

    

Body Parameters: __ __   

Property Name    

Example Value    

Required    

Description    

Patient    

    

abc@abdm    

Yes    

A unique and valid ABHA address suffix with @abdm for live and @sbx for Sandbox   

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

Patient reference    

Id    

careContextReference    

Episode11    

No    

Care context reference  

Hiu    

Sub\_HIU    

Yes    

Health information user 

Id    

Requester\-name    

Smith    

yes    

Name of the requester   

Requester\-identifiertype    

REGN01    

yes    

Requester identifier type    

Requester\-identifiervalue    

MH1001    

yes    

Requester identifier value    

Requester\-identifiersystem   

 https://www\.mciindia\.org    

yes    

Requester identifier system    

hiTypes    

\["Prescription",    

"DiagnosticReport",    

"DischargeSummary    

"ImmunizationRecord",    

"HealthDocumentRecord",    

"WellnessRecord",    

"OPConsultation"\]    

yes    

Type of document    

PermissionaccessMode    

VIEW    

yes    

Access mode of consent    

PermissiondateRange    

"from": "2023\-05\-09T08:58:09\.738Z",    

"to": "2023\-05\-10T08:58:09\.738Z"    

yes    

Data range of permission required    

PermissiondateEraseAt    

2023\-05\-25T08:58:09\.738Z    

yes    

Date of erase data    

Permissionfrequency\-value   

 0    

yes    

Frequency value for consent    

Permissionfrequencyrepeats 

0    

yes    

Frequency repeats for consent    

Permissionfrequency\-unit    

HOUR    

yes    

Frequency unit for consent    

hiTypes    

“PRESCRIPTION”    

yes    

hiTypes of the patient   details\. It is  a list,  there can be more than one hitype\.    

__ __   

__Request Body:  __   

Request Body    

  

 

[image removed - see original document]

            

\{

 

  

 

                

"

patientReference

": "xxxx@sbx", 

  

 

                

"

careContextReference

": "COCa496bc2f

\-

ca6c

\-

5

af

4

\-

b973

\-

e915fd9815" 

02

  

 

            

 

\}

  

 

        

\]

 

  

    

\}

 

  

 

\}

 

 

 

  

 

__Response Body:__     

Response    

Code : 202 Accepted    

    

__Error scenarios: __   

__Scenarios __   

__Request Body __   

__Response __   

To verify  when   

Request ID is  Blank, null or empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",            "value": "",    

        "type": "text"    

    \}    

\]    

Access Denied     

Code : 403 Forbidden     

To verify when invalid RequestID is pass in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}\]    

\{    

    "code": "ABDM\-1030: ",    

    "message": "Invalid request ID"    

\}    

Code: 400Bad Request     

    

When X\-CM\-   

ID is Invalid, Blank, null or empty in header\.   

\[    

    \{    

  	   

        "key": "X\-CM\-ID", 

        "value": "sbxdvdfvdf",    

        "type": "text"    

    \}    

Access Denied     

Code : 403 Forbidden     

   

   

\]    

   

Verify    

message when purpose text is empty or null    

     

  \{    

    "consent": \{    

        "purpose": \{    

            "text": "",    

            "code": " CAREMGT",    

            "refUri": "string"    

        \},    

        "patient": \{    

            "id": "xxxxxxxxx@abdm"    

        \},    

        "hip": \{    

            "id": "HIP\_ID"    

        \},    

        "careContexts": \[    

            \{    

                "patientReference": "xxxxx@tmh",    

                "careContextReference": "Episode11"    

            \}    

        \],    

        "hiu": \{    

            "id": "HIU\_ID"    

        \},    

        "requester": \{    

            "name": "Dr\. xxxx",    

            "identifier": \{    

                "type": "REGNO1",    

                "value": "MH10XX",    

\{    

    "code": "ABDM\-9999",    

    "message": "Consent purpose text cannot be null"    

\}    

    

   

  

   

                "system": "https://www\.xxxxxx\.org"    

            \}    

        \},    

        "hiTypes": \[    

            "OPCONSULTATION",    

            "WELLNESSRECORD"    

        \],    

        "permission": \{    

            "accessMode": "VIEW",    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2023\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}    

    \}    

\}    

   

Verify    

message when purpose text is not any of the following:    

Care    

Management,    

Break the    

Glass, Public    

Health,    

Healthcare    

Payment,    

  \{    

    "consent": \{    

        "purpose": \{    

            "text": "Care Management123",    

            "code": "CAREMGT",    

            "refUri": "string"    

        \},    

        "patient": \{    

            "id": "xxxxxxxxxxxxx@abdm"    

\{    

        "code": "ABDM\-9999: ",    

"message": "Invalid purpose text, it must   

be in Care Management,    Break the Glass, Public Health,    

Healthcare Payment, Disease    

Specific Healthcare Research, Self  Requested"    

\}    

    

   	 

Disease    

Specific    

Healthcare  

Research, Self  

Requested    

     

        \},    

        "hip": \{    

            "id": "SBX\_HIP1"    

        \},    

        "careContexts": \[    

            \{    

                "patientReference": "xxxxx@tmh",    

                "careContextReference": "Episode11"    

            \}    

        \],    

        "hiu": \{    

            "id": "HIU\_ID"    

        \},    

        "requester": \{    

            "name": "Dr\. xxxxx",    

            "identifier": \{    

                "type": "REGNO1",    

                "value": "MH1001",    

                "system": "https://www\.xxxxxx\.org"    

            \}    

        \},    

        "hiTypes": \[    

            "OPCONSULTATION",    

            "WELLNESSRECORD"    

        \],    

        "permission": \{    

            "accessMode": "VIEW",    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2023\-05\-10T08:58:09\.738Z"    

            \},    

   

   

 

   

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}    

    \}    

\}    

   

Verify    

message when purpose code is empty or null    

     

  \{    

    "consent": \{    

        "purpose": \{    

            "text": "Care Management",    

            "code": " ",    

            "refUri": "string"    

        \},    

        "patient": \{    

            "id": "xxxxxx@abdm"    

        \},    

        "hip": \{    

            "id": "HIP\_ID"    

        \},    

        "careContexts": \[    

            \{    

                "patientReference": "xxxxx@tmh",    

                "careContextReference": "Episode11"    

            \}    

        \],    

        "hiu": \{    

            "id": "HIU\_ID"    

        \},    

\{    

    "code": "ABDM\-9999",    

    "message": "Consent purpose code 

cannot be null"    

\}    

    

   

   

        "requester": \{    

            "name": "Dr\. xxxxx",    

            "identifier": \{    

                "type": "REGNO1",    

                "value": "MH1001",    

                "system": "https://www\.mciindia\.org"    

            \}    

        \},    

        "hiTypes": \[    

            "OPCONSULTATION",    

            "WELLNESSRECORD"    

        \],    

        "permission": \{    

            "accessMode": "VIEW",    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",                    "to": "2023\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}    

    \}    

\}    

   

     

Verify    

message when purpose text is not any of the following:    

CAREMGT,    

BTG, PUBHLTH,    

HPAYMT,    

DSRCH,    

PATRQT    

    

     

  \{    

    "consent": \{    

        "purpose": \{    

            "text": "Care Management",    

            "code": "CARE",    

            "refUri": "www\.ref\.com"    

        \},    

        "patient": \{    

            "id": "xxxxxxx@abdm"    

        \},    

        "hip": \{    

            "id": "HIP\_ID "    

        \},    

        "careContexts": \[    

            \{    

                "patientReference": "xxxxxx@tmh",    

                "careContextReference": "Episode11"    

            \}    

        \],    

        "hiu": \{    

            "id": "HIU\_ID "    

        \},    

        "requester": \{    

            "name": "Dr\. Manjula",    

            "identifier": \{    

                "type": "REGNO1",    

                "value": "MH1001",    

                "system": "https://www\.mciindia\.org"    

            \}    

        \},    

        "hiTypes": \[    

            "OPCONSULTATION",    

\{    

    "code": "ABDM\-9999",    

    "message": "Invalid purpose code, it must be in CAREMGT, BTG, PUBHLTH,  HPAYMT, DSRCH, PATRQT"    

\}    

    

  

   

            "WELLNESSRECORD"    

        \],    

        "permission": \{    

            "accessMode": "VIEW",    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2023\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}    

    \}    

\}    

   

Verify    

message when   

the  refUri is null,  empty or invalid\.    

  \{    

    "consent": \{    

        "purpose": \{    

            "text": "Care Management",    

            "code": "CARE",    

            "refUri": ""    

        \},    

        "patient": \{    

            "id": "xxxxxxx@abdm"    

        \},    

        "hip": \{    

            "id": "SBX\_HIP1"    

        \},    

        "careContexts": \[    

\{    

    "code": "ABDM\-9999",    

    "message": "Invalid consent purpose refURI"    

\}    

    

  	 

 

   

            \{    

                "patientReference": "batman@tmh",    

                "careContextReference": "Episode11"    

            \}    

        \],    

        "hiu": \{    

            "id": "HIU\_ID "    

        \},    

        "requester": \{    

            "name": "Dr\. Manjula",    

            "identifier": \{    

                "type": "REGNO1",    

                "value": "MH1001",    

                "system": "https://www\.mciindia\.org"    

            \}    

        \},    

        "hiTypes": \[    

            "OPCONSULTATION",    

            "WELLNESSRECORD"    

        \],    

        "permission": \{    

            "accessMode": "VIEW",    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",                    "to": "2023\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

   

   

            \}    

        \}     

    \}    

\}    

   

Verify    

message when the permission access mode is null\.    

        "permission": \{    

            "accessMode": null,    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2023\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}    

\{    

    "code": "ABDM\-9999",    

    "message": Invalid accessMode, it must be in VIEW, STORE, QUERY, STREAM"    

\}    

    

Verify    

message when the permission date range is null\.    

        "permission": \{    

            "accessMode": “VIEW”,    

            "dateRange": null,    

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}    

\{    

    "code": "ABDM\-9999",    

    "message": “DateRange should not be null or empty"    

\}    

    

   

Verify    

message when the permission date range is in future\.    

        "permission": \{    

            "accessMode": “VIEW”,    

            "dateRange": \{    

                "from": "2026\-05\-09T08:58:09\.738Z",    

                "to": "2028\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}    

\{    

    "code": "ABDM\-9999",    

    "message": “Invalid from/to  date\. Date must be a present/before date"    

\}    

    

Verify    

message when the dataEraseAt is not a future date\.    

        "permission": \{    

            "accessMode": “VIEW”,    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2024\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2029\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}    

\{    

    "code": "ABDM\-9999",    

    "message": “Invalid data erase date\.   

Date must be a future date"    

\}    

    

     

 

Verify    

message when the permission frequency is null\.   

        "permission": \{    

            "accessMode": “VIEW”,    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2024\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2029\-05\- 25T08:58:09\.738Z",    

            "frequency": null    

\{    

    "code": "ABDM\-9999",    

    "message": “Frequency should not be null or empty"    

\}    

    

Verify    

message when the frequency unit is null\.    

        "permission": \{    

            "accessMode": “VIEW”,    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2024\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2029\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": null,    

                "value": 0,    

                "repeats": 0    

            \}    

        \}    

\{    

    "code": "ABDM\-9999",    

    "message": “Frequency unit should not be null or empty"    

\}    

    

Verify  message  when null, empty or invalid abha address\.    

  \{    

    "consent": \{    

        "purpose": \{    

            "text": "Care Management",    

            "code": "CARE",    

            "refUri": ""            \},    

        "patient": \{    

            "id": "xxxxxxxx@abdm"    

        \},    

\{    

    "code": "ABDM\-9999",    

    "message": “Invalid ABHA    

Address, it must start with Alphanumeric \. and  \_  in the middle and must be ending with @abdm or @sbx"    

\}    

    

   	  	 

   

        "hip": \{    

            "id": "HIP\_ID"    

        \},    

        "careContexts": \[    

            \{    

                "patientReference": "batman@tmh",    

                "careContextReference": "Episode11"    

            \}    

        \],    

        "hiu": \{    

            "id": "HIU\_ID"    

        \},    

        "requester": \{    

            "name": "Dr\. Manjula",    

            "identifier": \{    

                "type": "REGNO1",    

                "value": "MH1001",    

                "system": "https://www\.mciindia\.org"    

            \}    

        \},    

        "hiTypes": \[    

            "OPCONSULTATION",    

            "WELLNESSRECORD"    

        \],    

        "permission": \{    

            "accessMode": "VIEW",    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2023\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2023\-0525T08:58:09\.738Z",    

   

   

  

   

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}     

    \}    

\}    

   

 	 

Verify  message  when null,  empty or  invalid HIP or    

HIU service id\.    

  \{    

    "consent": \{    

        "purpose": \{    

            "text": "Care Management",    

            "code": "CARE",    

            "refUri": ""            \},    

        "patient": \{    

            "id": "xxxxxxxxxxxx@abdm"    

        \},    

        "hip": \{    

            "id": "SBX\_HIP1"    

        \},    

        "careContexts": \[    

            \{    

                "patientReference": "batman@tmh",    

                "careContextReference": "Episode11"    

            \}    

        \],    

        "hiu": \{    

            "id": "Sub\_HIU"    

        \},    

        "requester": \{    

            "name": "Dr\. Manjula",    

\{    

    "code": "ABDM\-9999",    

    "message": “Invalid Service ID, it must be Alpha numeric and \_ or \- in middle"    

\}    

    

    

   

            "identifier": \{    

                "type": "REGNO1",    

                "value": "MH1001",    

                "system": "https://www\.mciindia\.org"    

            \}    

        \},    

        "hiTypes": \[    

            "OPCONSULTATION",    

            "WELLNESSRECORD"    

        \],    

        "permission": \{    

            "accessMode": "VIEW",    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2023\-05\-10T08:58:09\.738Z"    

            \},    

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}     

    \}    

\}    

   

Verify  message  when null,  empty or  invalid HIP or    

HIU service id\.    

  \{    

    "consent": \{    

        "purpose": \{    

            "text": "Care Management",    

            "code": "CARE",    

            "refUri": "www\.ref\.com"    

\{    

    "code": "ABDM\-1031",    

    "message": “HIP is mandatory when care contexts are specified"    

\}    

    

   	  	 

  	 

 

   

        \},    

        "patient": \{    

            "id": "18443810806440@abdm"    

        \},    

        "hip": null,    

        "careContexts": \[    

            \{    

                "patientReference": "batman@tmh",    

                "careContextReference": "Episode11"    

            \}    

        \],    

        "hiu": \{    

            "id": "Sub\_HIU"    

        \},    

        "requester": \{    

            "name": "Dr\. Manjula",    

            "identifier": \{    

                "type": "REGNO1",    

                "value": "MH1001",    

                "system": "https://www\.mciindia\.org"    

            \}    

        \},    

        "hiTypes": \[    

            "OPCONSULTATION",    

            "WELLNESSRECORD"    

        \],    

        "permission": \{    

            "accessMode": "VIEW",    

            "dateRange": \{    

                "from": "2023\-05\-09T08:58:09\.738Z",    

                "to": "2023\-05\-10T08:58:09\.738Z"    

            \},    

   

   

            "dataEraseAt": "2023\-05\- 25T08:58:09\.738Z",    

            "frequency": \{    

                "unit": "HOUR",    

                "value": 0,    

                "repeats": 0    

            \}    

        \}     

    \}    

\}    

   

    

### <a id="_Toc213410247"></a>HIE\-CM\- Consent request init \- call back      

This API initiated by HIE\-CM to get the consent request call back to HIU    

__ __   

__URL__: \{callback\}/api/v3/hiu/consent/request/on\-init __Request:__ POST __Header Parameters:__     

Property    

Name    

Example Value    

Required    

Description    

Authorization    

Gateway Session Token    

Yes    

ABDM Gateway    

Session Token    

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction    

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

__Actual time when request was initiated, ISO Date time format represents date and time__    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

X\-HIU\-ID    

HIU\_ID    

Yes    

Identifier of the health information user by which the request was initiated    

    

Body Paramaters: __ __   

Property Name    

Example Value    

Required    

Description    

consentRequest – id    

f29f0e59\-8388\-4698\-9fe605db67aeac46    

No    

The consent request id generated for consent init request\.    

requestId    

6f0b4665\-a915\-4c92\-aa36\-   

65afb4a2cd71    

Yes    

Unique UUID from the consent init request\.    

Error    

"error": \{    

    "code": "ABDM\-1001",    

    "message": "unable to connect database"    

  \}    

No    

The error code and message if any happened\.    

Request Body:     

Request Body    

\{    

  "consentRequest": \{    

    "id": "05f14b1d\-4465\-453a\-8249\-1382d79d271d"    

  \},    

  "error": null,    

  "response": \{    

    "requestId": "4213ebf8\-5f8a\-45e4\-a014\-7a2eb875f213"    

  \}   \}        

__ __   

__Response Body:__     

Response    

Code : 202 Accepted    

[image removed - see original document]__ __   

### <a id="_Toc213410248"></a>HIE\-CM\- Callback API to HIU when a consent request is APPROVED/REVOKED/DENIED   

Once the patient grants consent to the HIU, the CM notifies the HIU system of the consent grant via the gateway\. If the patient grants for multiple HIPs, then multiple consent artefacts are generated \- one for each HIP\. The HIU now first fetches all the consentartefacts that were generated for his request\.__ __   

__URL__: \{\{callback\}\} /api/v3/hiu/consent/request/notify __Request:__ POST  __Header Parameters:__     

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

X\-HIU\-ID    

eyJhbGciOiJSUzUxMiJ9\.eyJzdWIiOiIx    

ODQ0MzgxMDgwNjQ0MEBhYmRt    

Yes    

Identifier to the health information user\.    

__Body parameters:__     

Property Name    

Example Value    

 

Required    

Description    

status    

GRANTED    

Yes     

The status of the consent artefact    

consentRequestId    

3fa85f64\-5717\-4562b3fc\-  

2c963f66afa6    

Yes    

The consent request    

id    

reason    

Not Authorized    

No    

Reason for denying the consent request    

consentArtefacts    

"consentArtefacts": \[    

      \{    

        "id": “3fa85f64\-   5717\-4562\-b3fc\-   

2c963f66afa6”    

      \}    

    \]    

No    

List of consent artefact ids that was created    

__Request Body:__     

Request Body:    

\{     

"notification": \{        "consentRequestId": "e3c74829\-3f82\-4f94\-959e\-e10f57bcd57b",     "status": "GRANTED",    

    "reason": null,    

    "consentArtefacts": \[    

      \{    

        "id": "<consent\-artefact\-id>"    

      \}    

    \]    

  \}   \}    

__ __   

__Response Body__:     

Response    

Status: 202 Accepted    

    

[image removed - see original document]    

### <a id="_Toc213410249"></a>HIE\-CM – API for HIU to respond back to consent HIU callback    

This API will be invoked by HIU to respond back to HIE\-CM when they received notify call after approve /deny / revoke\.     

/api/v3/hiu/consent/request/notify\.__ __   

__URL:__ /api/hiecm/consent/v3/request/hiu/on\-notify   __Request:__ POST  

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

__ __   

__ __   

__Body parameters:__     

Property Name    

Example Value    

  

Required    

Description    

status    

OK    

Yes      

The status of the consent notify\.    

consentId    

3fa85f64\-5717\-4562b3fc\-  

2c963f66afa6    

Yes    	  

The consent artefact    

id    

error    

"error": \{    

    "code": "ABDM\-1001",        "message": "unable to connect database"    

  \}    

No    

The error code and message if any happened\.    

requestId     

3fa85f64\-5717\-4562b3fc\-  

2c963f66afa6    

Yes    

The request id from the   

/hiu/consent/request/notify  

__Request Body:__     

Request Body:    

\{    

  "acknowledgement": \[    

    \{    

      "status": "OK",    

      "consentId": "e3c74829\-3f82\-4f94\-959e\-e10f57bcd57b"    

    \}    

  \],    

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

__ __   

__ __   

__Error Scenarios: __   

Scenarios    

Headers/Body    

Message    

   

To verify when Request ID is Blank,  null or empty in  header    

\[    

    \{    

        "key": "REQUEST\-ID",       

"value": "",    

        "type": "text"    

    \}    

\]  

Access Denied     

Code : 403 Forbidden     

    

    

To verify when invalid Request\-ID is pass in header     

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}    

\]    

\{    

    "code": "ABDM\-1030: ",    

    "message": "Invalid requ est   

ID"    \}    

    

Code \- 400Bad Request    

    

    

When Timestamp is  Blank, null or empty in header\.     

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "",    

        "type": "text"    

    \}    

\]    

    

Access Denied     

Code : 403 Forbidden     

    

    

When invalid Timestamp  is pass  in header    

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",    

        "type": "text"    

    \}    

\]    

\{    

    "code": "ABDM\-1016: ",        "message": "Invalid Time stamp"    

\}    

    

Code \- 400Bad Request    

To verify when X\- CM\-ID is Blank, null or empty in header    

\[    

    \{    

        "key": " X\-CM\-ID",    

        "value": "",    

        "type": "text"    

    \}    

\]    

Access Denied     

Code : 403 Forbidden     

    

    

    

### <a id="_Toc213410250"></a>HIE\-CM\- Consent request status    

This API will be called to get the status of the consent request\.    

__URL:__ /api/hiecm/consent/v3/request/status __Request:__ POST  __Header Parameters: __    

__Property Name __   

__Example Value __   

__Required __   

__Description __   

REQUEST\-ID    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time\.__ __   

Authorization    

Gateway Session Token    

Yes    

JWT Access token which was issued by ABDM session API after successful validation of client id and secret    

X\-HIU\-ID    

HIU\_ID    

Yes    

Identifier of the health information user to which the request was intended    

__ __   

__Body Paramaters:  __   

__Property Name __   

__Example Value __   

__Required __   

__Description __   

consentRequestId    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    

__Unique UUID for consent request__    

__Request Body:  __   

Request Body: 

   

\{    

\}    

    

    "consentRequestId": "05f14b1d\-4465\-453a\-8249\-1382d79d271d" 

__Response Body__:     

Response    

Code : 200 OK     

    

__Error scenarios: __   

  

Scenarios    

Headers/Body    

Message    

To verify when   

Request ID is  Blank, null or empty in header  

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}    

\]    

Access Denied     

Code : 403 Forbidden     

To verify when invalid RequestID is pass in header  

\[    

     \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",           "type": "text"    

    \}    

\]    

\{    

    "code": "ABDM\-1030: ",    

    "message": "Invalid request ID"    

\}    

Code \- 400Bad Request    

  

   

  

When   

Timestamp    

is Blank, null or empty in header\.     

\[    

    \{    

        "key": "TIMESTAMP",            "value": "",    

        "type": "text"    

    \}    

\]    

Access Denied     

Code : 403 Forbidden     

 

When invalid Timestamp  is pass in header    

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",    

        "type": "text"    

    \}    

\]    

    

\{    

    "code": "ABDM\-1016: ",    

    "message": "Invalid Timestamp"    

\}    

    

Code \- 400Bad Request    

    

When X\-CM\-   

ID is Invalid, 

Blank, null or empty in header\. 

\[    

    \{    

         "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"    

    \}    

\]    

Access Denied     

Code : 403 Forbidden     

     

When X\-HIU\-   ID is Blank, null or empty in header\.      

\[    

    \{    

        "key": "X\-HIU\-ID",    

        "value": "",    

        "type": "text"    

    \}    

\]    

Access Denied     

Code : 403 Forbidden    

     

When passing   

invalid    

Consent    

Request Id    

\{    

    "consentRequestId": "002e14ac\-13"    

\}    

    

Callback : \{    

    "error": \{    

        "code": "ABDM\-1039: ",    

        "message": "Invalid Consent req uest id"   

    \},    

    "response": \{    

        "requestId": "fe717659\-f438\- 4bda\-8f7c\- 0ba13e9c5f61"    

    \}    

\}    

    

code \- 200 OK    

When   passing Null Consent    

Request Id    

\{    

    "consentRequestId":__null__    

\}    

    

    

\[    

    \{    

        "code": "ABDM\-9999: ",    

        "message": "Invalid Consent req uest id"   

    \}    

\]    

    

Code \- 400Bad Request    

When body  

missing    

     

\{    

    "code": "ABDM\-1064",    

    "message": "Request body was mis sing"    

\}    

    

Code \- 400Bad Request    

    

    

### <a id="_Toc213410251"></a>HIE\-CM \- Consent request on\-status \(Callback\)    

This API is used to send the status of consent request back to HIU through HIE\-CM  __URL:__  \{callback\_url\}/api/v3/hiu/consent/request/on\-status __Request:__ POST__ Header Parameters: __    

__Property Name __   

__Example Value __   

__Required __   

__Description __   

REQUEST\-ID    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time\.__ __ 

X\-HIU\-ID    

HIU\_ID    

Yes    

Identifier of the health information user to which the request was intended    

Authorization    

Gateway Session Token    

Yes    

ABDM Gateway Session Token__ __   

[image removed - see original document] 

__ __   

__Response Body__: The table below illustrates the response body    

    

Response    

Code : 200 OK     

[image removed - see original document]__ __   

### <a id="_Toc213410252"></a>HIE\-CM \- Consent request fetch    

This API will be called to fetch the consent artifact details\.    

__URL:__ /api/hiecm/consent/v3/fetch    

__Request:__ POST    

__Header Parameters: __    

__Property Name __   

__Example Value __   

__Required __   

__Description __   

REQUEST\-ID    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    

__Unique UUID for track the end to end request transaction __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

__Actual time when request was initiated, ISO __ __Date time format represents date and time __   

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

X\-HIU\-ID    

HIU\_ID    

Yes    

Health information user unique ID    

Authorization    

Gateway Session Token    

Yes    

__JWT Access token which was issued by ABDM session API after successful validation of client id and secret__    

__Body parameters:__     

__Property Name __   

__Example Value __   

__Required __   

__Description __   

consentId    

18235d89\-cb13\-   

479d\-ad717a57d5f669a8   

Yes    

__Unique UUID of the validate the consent to share the data between HIP and HIU__    

__Request Body: __    

Request Body:    

\{    

   "consentId": "d6a83f24\-6c96\-421e\-b8b8\-844e5344ef69"    

\}     

__Response Body__:     

   

  	  	  

Code : 202 OK    	  	   	  

__Error Scenarios: __   

Scenarios    

Headers/Body    

Message    

To verify  when   

Request ID is  Blank, null or empty in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "",    

        "type": "text"    

    \}    

\]    

Access Denied     

Code : 403 Forbidden     

     

   

To verify  when    

invalid    

Request\-ID is pass in header    

\[    

    \{    

        "key": "REQUEST\-ID",    

        "value": "*\{\{$guid\}\}*zxzzxs",    

        "type": "text"    

    \}    

\]    

\{    

    "code": "ABDM\-1030: ",    

    "message": "Invalid request ID"    

\}    

    

Code \- 400Bad Request    

    

    

When   

Timestamp    

is Blank, null or empty in header\.     

\[    

    \{    

        "key": "TIMESTAMP",            "value": "",    

        "type": "text"    

    \}    

\]    

Access Denied     

Code : 403 Forbidden     

     

When    

invalid    

Timestamp is pass in header    

\[    

    \{    

        "key": "TIMESTAMP",    

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",    

        "type": "text"    

    \}    

\]    

\{    

    "code": "ABDM\-1016: ",    

    "message": "Invalid Timestamp"    

\}    

    

Code \- 400Bad Request    

    

When X\- CM\-ID  is   Invalid,    

Blank, null or empty in header\.     

\[    

    \{    

        "key": "X\-CM\-ID",    

        "value": "sbxdvdfvdf",    

        "type": "text"    

Access Denied     

Code : 403 Forbidden     

     

   

   

    \}    

\]    

   

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

     

When passing  invalid Consent  artefact Id    

\{    

   "consentId": "1769c167\-0898\-43"    

\}    

    

    

Callback : \{    

    "error": \{    

        "code": "ABDM\-1080: ",    

        "message": "Invalid Consent artefa ct id"    

    \},    

    "response": \{    

        "requestId": "7c4c31dadfd04348a907c08ea4016cbe"    

    \}    

\}    

    

code \- 200 OK    

When   passing Null Consent  artefact Id    

\{    

   "consentId": null    

\}    

    

    

\[    

    \{    

        "code": "ABDM\-9999: ",    

        "message": "Invalid Consent artefa ct id"    

    \}    

\]    

    

Code \- 400Bad Request    

When body  

missing    

     

\{    

    "code": "ABDM\-1064",    

    "message": "Request body was missi ng"    

\}    

    

Code \- 400Bad Request    

__ __   

### <a id="_Toc213410253"></a>HIE\-CM \- Consent request on\-fetch \(callback\)    

This API is used to send the consent artifact details to HIU through HIE\-CM  __URL:__ \{callback\_url\} /api/v3/hiu/consent/on\-fetch __Request:__ POST __Header Parameters: __    

__Property Name __   

__Example Value __   

__Required __   

__Description __   

REQUEST\-ID    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    

__Unique UUID for track the end to end request transaction __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

__Actual time when request was initiated, ISO __ __Date time format represents date and time __   

X\-HIU\-ID    

HIU\_ID    

Yes    

Health information user unique ID    

Authorization    

Gateway Session Token    

Yes    

__ABDM Gateway Session Token__    

__Body parameters:__     

Property Name    

Example Value    

Require d   

 Descriptio n    

Status    

GRANTED    

Yes    

Current status consent request    

consentId    

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

Yes    

Consent  

artefact id    

Hip    

ABDM\_HIP    

No    

Health information provider ID    

   

Patient\-id    

user@abdm    

Yes    

The abha address   

Purpose\-text    

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

Patient reference   

Id    

careContextReference    

Episode11    

No    

Care context reference    

hiu    

HIU\_ID    

Yes    

Health information user Id    

  

Requester\-name    

Smith    

Yes    

Name of the requester    

Requester\-identifiertype    

REGN01    

Yes    

Requester 

identifier type    

Requester\-identifiervalue    

MH1001    

Yes    

Requester 

identifier value    

Requester\-identifiersystem   

 https://www\.mciindia\.org    

Yes    

Requester  identifier system    

hiTypes    

\["Prescription",    

"DiagnosticReport",    

"DischargeSummary    

"ImmunizationRecord",    

"HealthDocumentRecord",    

"WellnessRecord",    

"OPConsultation"\]    

Yes    

Type of document  

PermissionaccessMode    

VIEW    

Yes    

Access mode of consent    

PermissiondateRange    

"from": "2023\-05\-09T08:58:09\.738Z",    

"to": "2023\-05\-10T08:58:09\.738Z"    

Yes    

Data range of permission required    

PermissiondateEraseAt    

2023\-05\-25T08:58:09\.738Z    

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

createdAt    

2023\-05\-25T08:58:09\.738Z    

Yes    

The date consent artefact created    

lastUpdated    

2023\-05\-25T08:58:09\.738Z    

Yes    

The date consent artefact last updated\.    

schemaVersion    

v3    

    

Yes    

Version    

Signature    

bAJUnf7nY6Yn6A7JbR1ZFHtBmqCjXDW   

ZaQte    

F\+XNgEImUchTgA4qp4i5KnUBXYsWuTK   

Be    

USf1cLFMUXGpQuD9OZzrMqA1PRnEWyh   

0     

lV9i1bsEm5VMBkeZa0ghQBc4Fj8g==    

Yes    

Signature of consent aretefact   

response\-requestId    

36de611a\-c3ab\-4794\-b803\-   

5eff9c94ddbf    

Yes    

Unique UUID for call back request    

__Request Body: __    

Request Body:    

\{    

  "consent": \{    

    "status": "GRANTED",    

    "consentDetail": \{    

      "consentId": "d6a83f24\-6c96\-421e\-b8b8\-844e5344ef69",    

      "hip": \{    

        "id": "HIP\_ID"    

      \},    

      "hiu": \{    

        "id": "HIU\_ID"    

      \},    

      "hiTypes": \[    

        "Prescription",    

        "DiagnosticReport",    

        "DischargeSummary",    

        "ImmunizationRecord",    

        "HealthDocumentRecord",    

        "WellnessRecord",    

        "OPConsultation"    

      \],    

      "patient": \{    

        "id": "xxxxxx@sbx"    

   

  

 

      \},    

      "purpose": \{    

        "text": "Care Management",         "code":   

"CAREMGT",    

        "refUri": "www\.abdm\.gov\.in"    

      \},    

      "createdAt": "2024\-08\-09T05:00:03\.265Z",    

      "requester": \{    

        "name": "Dr\. Manju",    

        "identifier": \{    

          "value": "MH1001",    

          "type": "REGNO",    

          "system": "https://www\.mciindia\.org"    

        \}    

      \},    

      "permission": \{    

        "accessMode": "VIEW",    

        "dateRange": \{    

          "from": "1924\-07\-09T12:05:57\.151Z",    

          "to": "2024\-07\-17T12:05:57\.151Z"    

        \},    

        "dataEraseAt": "2124\-12\-09T00:00:00\.000Z",    

        "frequency": \{    

          "unit": "DAY",    

          "value": 1,    

          "repeats": 0    

        \}    

      \},    

      "lastUpdated": "2024\-08\-09T05:00:03\.144Z",    

      "careContexts": \[    

        \{    

          "patientReference": "xxxxxxx@sbx",    

          "careContextReference": "COCa496bc2f\-ca6c\-4af5\-b973\-02e915fd9815"    

        \}    

      \],    

      "schemaVersion": "v3",    

      "consentManager": \{    

        "id": "sbx"    

      \}    

    \},    

    "signature": "pktEFkcXuMBPSCEb7ZbiRAOigEx3i5fvIVNS9CxAfgm7rRF9CoxyhO0OdX9Fe    

CzmcobBeiqNdLkiX2eYXdTI1oWvvEnSgMYBXVRi4q9rUgXexJr\+04QK6vk4lL2iwu6AfKqPTB8u  

3LF4v5kmCTXqdmtlfRof\+ue9avukW48yIij19okHYhTw2lOZQ=="    

  \},    

  "error": null,    

  "response": \{    

    "requestId": "c0027971\-d2d3\-4323\-8353\-881b7c8f7d2f"    

  \},    

  "resp": null    

\}    

__ __   

__Response Body__:     

Response    

Code : 200 OK    

[image removed - see original document]__ __   

   

[image removed - see original document][image removed - see original document]# <a id="_Toc213410254"></a>Data flow    

## <a id="_Toc213410255"></a>Overview    

The process of Data flow starts once the HIECM has generated Consent artefact \(Consent artefact is generated only if the status of Consent request is “Granted”\) and same is notified to HIP and HIU\.    

HIU sends pushback URL to HIP via HIECM\. HIP now bundles the care context or Health data of the patient as per FHIR standards and share the data via pushback data URL\.  

HIECM is notified the status of the data shared both by HIU and HIP\.    

## <a id="_Toc213410256"></a>Sequence Diagram    

    

[image removed - see original document]    

## <a id="_Toc213410257"></a>API Information Request & Response    

### <a id="_Toc213410258"></a>Data flow – Data request invoked by HIU    

The HIU system initiates data request for a patient’s health information to the HIP against the relevant consent\-artefact, through the CM\.    

As part of the data request, the HIU’s health repository embeds three key elements within the health information request:    

The consent ID corresponding to the consent artefact against which the information request is being made\.    

A data push URL, which is a callback URL that indicators where the information can be pushed by the HIP’s health repository\. This URL can be different from the HIU’s access URL, provided at the time of registration with the gateway\. The HIU can specify a different URL for the data flow, in order to keep its identity secret to the extent possible\.    

Several parameters such as the date\-time range for the requested and a set of encryption parameters for the HIP repository to encrypt the information\. The Elliptic\-curve Diffie– Hellman based encryption standard is used for encrypting health information\.    

Upon receipt of the data\-request, CM assigns a transaction ID \(txn\-id\) for the entire data flow and communicates this Id to the health repositories of the HIU and the HIP\.    

The HIU’s health repository relays all this information to the CM through the gateway\.  

From the CM, the information is relayed to the HIP’s health repository \(via the HIE\-CM\)\.    

__URL:__ /api/hiecm/data\-flow/v3/health\-information/request    

__Request:__ POST    

__Header Parameters:__ The table below illustrates the header parameters    

Property    

Name    

Example Value    

Required    

Description    

Authorization    

Gateway Session Token    

Yes    

JWT Access token which was issued by ABDM session API after successful validation of client id and secret    

REQUEST\-ID    

b22bc4a6\-7894\-431e\-9d800e289610d0f8    

Yes    

Unique UUID for track the endtoend request transaction    

TIMESTAMP    

2024\-08\-09T05:07:17\.151Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time__ __   

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

X\-HIU\-ID    

HIU\_ID    

Yes    

Identifier of the health information user by which the request was initiated    

__Body Parameters:  __   

The table below illustrates the body parameters  __ __   

Property    

Name    

Example Value    

Required    

Description    

Consent ID    

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

Yes    

Valid consent ID, which HIU must obtain to request patient data from a    

HIP    

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

    

ECDH is a key sharing algorithm, most commonly used to send encrypted messages\.  

ECDH works by multiplying your private key by another's public key to get a shared secret, then using that shared   

secret  to  perform symmetric encryption    

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

key agreement protocol that allows two parties,  each having an   

ellipticcurve public–private key pair, to establish a shared secret over an insecure channel    

Request Body: The table below illustrates the request body      

Request Body

 

  

 

\{

 

  

 

      

"

__hiRequest__

": \{ 

  

 

        

"

__consent__

": \{ 

  

 

            

"

__id__

": "004ff8e6

\-

a9d7

\-

4963

\-

822

b

\-

d9762179314e" 

  

 

        

\}

, 

  

 

        

"

__dateRange__

": \{ 

  

 

            

"

__from__

": "1924

\-

07

\-

09

T12:05:57\.151Z", 

  

 

            

"

__to__

": "2024

\-

07

\-

T12:05:57\.151Z" 

17

  

 

        

, 

\}

  

 

        

"

__dataPushUrl__

": "https://webhook\.site/2cfcc184

\-

5

d

29

\-

e2c

4

\-

974

d

\-

3

e56cbaa5cc1/v3/data/push", 

  

 

        

"

__keyMaterial__

": \{ 

  

 

            

"

__cryptoAlg__

": "ECDH", 

  

 

            

"

__curve__

": "Curve25519", 

  

 

            

"

__dhPublicKey__

": \{ 

  

 

                

"

__expiry__

": "2124

\-

11

\-

09

T00:00:00\.000Z", 

  

 

                

"

__parameters__

": "Curve25519/32byte random key", 

  

 

                

"

__keyValue__

": 

  

 

"BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0D pA=" 

  

 

            

, 

\}

  

 

            

"

__nonce__

": "0ka0stPfqmXWhX\+ODC/iOFMO0PXFdRjBdcEGbv55qqc=" 

  

 

        

\}

 

  

 

    

\}

 

  

\}

 

  

 

 

  

 

__ __   

__Response Body:__ The table below illustrates the response body    

Response    

Code : 202 Accepted    

    

[image removed - see original document]    

### <a id="_Toc213410259"></a>Data flow – call back to HIU    

This is the callback API for acknowledgment of Health information request of HIU\. CM calls this API when it has validated the Health Information request given the consent id\.   Either the hiRequest or error would need to be specified\. If the health info request was valid, then the hiRequest\.transactionId specifies the transaction context against which HIP would send over the data\.    

__URL:__ \{callback\_url/api/v3/hiu/health\-information/on\-request    

__Request:__ POST    

__Header Parameters: __The table below illustrates the header                parameters    

Property Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-   

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time__ __   

X\-HIU\-ID    

HIU\_ID    

Yes    

Identifier of the health information  

user by which the request was 

initiated    

Authorization    

    

Gateway Session Token    

Yes    

ABDM Gateway Session Token    

    

__Body Parameters: __The table below illustrates the body parameters__ __   

Property Name   

 	Example Value    

Required    

Description    

transactionId    

18235d89\-cb13\-  

479dad71\-7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

sessionStatus    

“REQUESTED”    

Yes    

Status of data transfer request__  __   

requestId    

“f29f0e59\-8388\-4698\-   

9fe6\-05db67aeac46”    

Yes    

Unique UUID received from HIU while initiating the following   

hiecm/api/v3/dataflow/healthinformation/request__ __ 

__ __   

__       Request Body: __The table below illustrates the request body__ __   

Request Body:    

\{    

  "hiRequest": \{    

    "transactionId": "3332b62a\-1cae\-454f\-a278\-aaf80724f2b6",    

    "sessionStatus": "REQUESTED"    

  \},    

  "error": null,    

  "response": \{    

    "requestId": "b22bc4a6\-7894\-431e\-9d80\-0e289610d0f8"    

  \}    

\}       

__ __   

__     Response Body:__ The table below illustrates the request body    

Response    

Code : 200 OK    

__ __   

__Error Scenario: __   

\{    

    "error": \{    

        "code": "ABDM\-1092",    

        "message": " Invalid or already expired consent artefact id "    

    \},    

    "response": \{    

        "requestId": "b07737a8\-1c79\-48cc\-9fb4\-1476c6bb1197"    

    \}    

\}    

    

[image removed - see original document]    

    

Response    

Code : 202 Accepted    

    

### <a id="_Toc213410260"></a>Notify    

This API will be called by HIU and HIP to notify the CM about the status of the data transfer\.    

    

HIP on the transfer of data would send sessionStatus \- one of \[TRANSFERRED, FAILED\]\. HIP would also send hiStatus for each careContextReference \- on of \[DELIVERED, ERRORED\]    

    

HIU on receipt of data would send sessionStatus \- one of \[RECEIVED, FAILED\]\. For example, ERRORED when data was not sent or if invalid data was sent\. HIU would also send hiStatus for each careContextReference \- one of \[OK, ERRORED\]\.    

__URL:__ /api/hiecm/data\-flow/v3/health\-information/notify 

__Request:__ POST    

__ __   

__ __   

__ __   

__Header Parameters: __The table below illustrates the header parameters    

__Property Name __   

__Example Value __   

__Required __   

__Description __   

REQUEST\-ID    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO   

Date time format represents date and time__ __   

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended__ __   

Authorization    

Gateway Session Token    

Yes    

JWT Access token which was issued by ABDM session API after    

successful validation of client id and secret__ __   

__Body parameters:__ The table below illustrates the body parameters    

__Property Name __   

__Example Value __   

__Required __   

__Description __   

consentId    

7497e59e\-fa17\-4be3b0b3\-  

5afe4f3b5136    

Yes    

Unique UUID of the validate the consent to share the data between HIP and HIU    

transactionId    

87624e00\-21b5\-43b1\-   

8ae7\-5adcb743ef7b    

Yes    

Unique UUID for track the end to end request transaction__ __   

doneAt    

024\-08\-09T08:06:07\.883Z    

Yes    

Actual time when notification is sent__ __   

Notifier    

\[    

    \{    

      "type": "HIU",    

      "id": HIU\_ID”    

    \} \]    

Yes    

Entity who is notifying HIE\-CM    

statusNotification    

\{"sessionStatus":   

"TRANSFERRED",    

"hipId": “HIP\_ID",   

"statusResponses": \[\{   

    	"careContextRefer   ence": "9ec54c2f\- 

2f3541d6982846a93e83564e",    

 "hiStatus": "OK",    

"description": "Care    

Management"\}\]\}    

Yes    

Detail about the status of the transaction will be sent in this section by HIP/HIU\.    

sessionStatus    

“TRANSFERRED”    

Yes    

HIU on receipt of data would send sessionStatus \- one of    

   

   

   

\[TRANSFERRED, FAILED\]\. For example, FAILED when if data was not sent or if invalid data was sent    

hiStatus    

 "OK",    

Yes    

HIU would also send hiStatus for each careContextReference \- one of \[OK, ERRORED\]    

__ __   

__Request Body: __The table below illustrates the request body     

  

 

\{

  

 

    

"

notification

": \{ 

  

 

        

"

consentId

": "97312afb

\-

c6a4

\-

e

483

\-

8456

\-

5

c9c96beb83f", 

  

 

        

"

transactionId

": "97312afb

\-

c6a4

\-

483

e

\-

8456

\-

c9c96beb83f", 

5

  

 

        

"

doneAt

": "2024

\-

08

\-

T08:45:55\.984Z", 

09

  

 

        

"

notifier

": \{ 

  

 

            

"

type

": "

 

HIU", 

  

 

            

"

id

": "HIU\_ID" 

  

 

        

, 

\}

  

 

        

"

statusNotification

": \{ 

  

 

            

"

sessionStatus

": "TRANSFERRED", 

  

 

            

"

hipId

": "HIP\_ID", 

  

 

            

"

statusResponses

": \[ 

  

 

                

\{

 

  

 

                    

"

careContextReference

": "9ec54c2f

\-

2

f

35

\-

41

d

6

\-

9828

\-

46

a93e83564e", 

  

 

                    

"

hiStatus

": "OK", 

  

 

                    

"

description

": "Care Management" 

  

 

                

 

\}

  

 

            

\]

 

  

 

        

\}

 

  

 

    

\}

 \} 

  

 

 

  

 

__Response Body__: The table below illustrates the response body    

Response    

[image removed - see original document]Code : 202 Accepted    

# <a id="_Toc213410261"></a>Subscription flow    

## <a id="_Toc213410262"></a>Overview    

HIU should initiate subscription requests so that it receives notifications/alerts whenever new information is available for the following categories\.    

1. LINK \- linking of a new Care\-context from HIPs against an ABHA address    
2. DATA \- availability of data against an existing care\-context from HIP\.  

__Note:  Subscription flow is restricted to the health locker and PHR\. Other than health locker and PHR, subscription flow is not authorized\.   __

While seeking subscription HIU needs to use the Gateway Subscription APIs identifying itself as a HIU\.     

Once user grants subscription to HIU, the HIU will be notified against the subscribed categories\.    

- 
	- If the subscription category is LINK \- HIU should initiate a consent request for the notified care context\. Once the user grants the consent against the request, HIU can initiate the data\-request\.    
	- In case subscription category is DATA \- then the HIU should check if any existing consent request is available \(hiType and duration etc\.\) and use the same to initiate the data\-request\.    

## <a id="_Toc213410263"></a>Sequence Diagram    

    

    

 [image removed - see original document]   

    

    

    

[image removed - see original document]    

    

[image removed - see original document]    

## <a id="_Toc213410264"></a>API Information Request & Response     

### <a id="_Toc213410265"></a>Users get subscription requests    

This is an API will be invoked by the patient/user from the PHR application to fetch his/her subscribed HIU details\.    

__URL:__ /api/hiecm/subscription\-requests/v3/requests 

__Method:__ 

GET   __Request Headers: __   

Property    

Name    

Example Value    

Required    

Description    

Authorization    

Gateway Session Token    

Yes    

JWT Access token which was issued by ABDM session API after successful validation of client id and secret__ __   

REQUEST\-ID    

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time__ __   

X\-AUTHTOKEN    

Login Token    

Yes    

JWT Authentication token which was issued by ABDM after successful  validation of    

username and password    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

Limit    

5    

Yes    

How many items to return at one time    

Offset    

5    

Yes    

How many items out    

of line    

Filters    

“GRANTED”    

Yes    

Query string parameter restricts the data returned from your request    

__ __   

__Body Parameters: __Not Applicable__ Request Body: __  

Not Applicable__ Response: __    

__ __   

Response:__ __   

Code: 202 OK    

\{    

    "limit": 5,    

    "size": 0,    

    "offset": 5,    

    "requests": \[    

        \{    

            "requestId": "f29f0e59\-8388\-4698\-9fe6\-05db67aeac46",    

            "subscriptionId": "f29f0e59\-8388\-4698\-9fe6\-05db67aeac46",    

            "requestType": "HEALTH\_LOCKER",    

            "status": "GRANTED",    

            "details": \{    

                "patient": \{    

                    "id": "xxxx@sbx"    

                \},    

                "purpose": \{    

                    "text": "abc@abdm",    

                    "code": "string",    

                    "refUri": "string"    

                \},    

                "hiu": \{    

                    "id": "HIU"    

                \},    

                "hips": \[    

                    \{    

                        "id": "HIP"    

                    \}    

                \],    

                "categories": \[    

                    "LINK"    

                \],    

                "period": \{    

                    "from": "2023\-01\-18 05:19:33\.429",    

                    "to": "2023\-01\-18 05:19:33\.429"    

                \}    

            \}    

        \}    

    \] \}   

  

    

### <a id="_Toc213410266"></a>User subscription request initiate    

This is the API which will be invoked by the HIU to initiate subscription request to the patient/user from PHR application     

__URL:__ /api/hiecm/subscription\-requests/v3/init__ __ __Method:__   

Post __Request Headers: __   

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

Actual time when request was initiated, ISO Date time format represents date and time    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

Authorization    

Gateway Session Token    

Yes    

JWT Access token which was issued by ABDM session  

API after successful validation of client id and secret__ __   

__Body parameters __   

Property    

Name    

Example Value    

Required    

Description    

subscription    

"purpose": \{    

    "text": "Care Management",    

    "code": "CAREMGT",    

    "refUri": "www\.abc\.com2"    

\}    

    Yes    

Purpose of Use \- defines what is the purpose of use of the health information that a HIU is requesting for\. The following are subset from http://terminology\.hl7\.org/ValueSet/v   

3\-PurposeOfUse    

Patient    

"id": "xxxxxxxxx@abdm"    

Yes    

Patient ABHA address against which the health records are linked    

Hiu    

"id": "HIU"    

Yes    

    

Hips    

\[    

      \{    

                "id": "HIP\_ID",    

                "name": "HIP\_NAME",    

                "type": "HIP"                \}   \]    

NO    

    

categories    

\[    

 "LINK",    

  "DATA"    

Yes    

Locker should initiate subscription request so that it receives notifications/alerts whenever new    

   

\]    

   

information is available for following categories\.    

1. LINK \- linking of a new Carecontext from HIPs    
2. DATA \- availability against an existing care\-context from HIP    

Period    

\{    

    "from": "2023\-04\- 04T09:52:39\.235Z",    

    "to": "2023\-0420T09:52:39\.235Z"    

\}    

Yes    

Period for which the subscription is valid\.    

__Request Body __   

Request Body:__ __   

\{    

    "subscription": \{    

        "purpose": \{    

            "text": "Care Management",    

            "code": "CAREMGT",    

            "refUri": "www\.abdm\.gov\.in"    

        \},    

        "patient": \{    

            "id": "xxxxx@sbx"    

        \},    

        "hiu": \{    

            "id": "HIU\_ID"    

        \},    

        "hips": \[    

            \{    

                "id": "HIP\_ID",    

                "name": "HIP\_NAME",    

                "type": "HIP"    

            \}    

        \],    

        "categories": \[    

            "LINK",    

            "DATA"    

        \],    

        "period": \{    

            "from": "2024\-06\-01T09:00:00\.000Z",    

            "to": "2124\-12\-31T09:00:00\.000Z"    

        \}    

    \}    \}    

__ __   

__ __   

__Response __   

Response:__ __   

Code: 202 Accepted\.     

    

    

### <a id="_Toc213410267"></a>User Subscription request initiate – Call Back    

This is the API which will be invoked by the HIU to initiate subscription request\.    

__URL:__ \{\{call back\}\}/api/v3/hiu/hiecm/subscription\-requests/on\-init __Method:__ Post __Request Headers: __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-   

479d\-ad717a57d5f669a8    

Yes    

Unique UUID for track the end\-to\-end request transaction   

TIMESTAMP    

2022\-10\-   

06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time    

X\-CM\-ID    

sbx    

Yes    

    

Authorization    

Gateway Session Token    

Yes    

ABDM JWT Token    

__Body parameters __   

Property    

Name    

Example Value    

Required    

Description    

subscription Request    

    

\{    

    "id": "34c9b142\-8a2c\-4f4a\- 8d98c305dbdbbcbb"    

  \}    

    

    

    

    

response    

    

\{    

    "requestId": "c8bd00d4\-

58d14d888b88a5f0c5817f06"    

  \}    

    

    

    

__ __   

__ __   

__ __   

__Response TO HIU in call back url __   

Response:__ __   

\{    

  "subscriptionRequest": \{    

    "id": "34c9b142\-8a2c\-4f4a\-8d98\-c305dbdbbcbb"    

  \},    

  "response": \{    

    "requestId": "c8bd00d4\-58d1\-4d88\-8b88\-a5f0c5817f06"    

  \}   \}    

    

Code : 202 Accepted    

__ __   

[image removed - see original document]__ __   

### <a id="_Toc213410268"></a>Approve Subscription Request     

This Api will be invoked by the patient/user from PHR application to approve the subscription request raised by the HIU    

__URL:__ /api/hiecm/subscription\-  requests/v3/\{\{subscription\_requestid\}\}/approve    __Method:__ Post    

__ __   

__ __   

__ __   

__ __   

__ __   

__Request Headers: __   

Property    Name    

Example Value    

Required    

Description    

REQUEST\-   

ID    

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

Yes    

__Unique UUID for track the end to end request transaction __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and  time    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

X\-  

AUTHTOKEN 

Login JWT Token    

 

    

JWT Authentication token which was issued by ABDM after successful validation of username and password    

Authorizati on 

 Gateway Session Token    

Yes    

__JWT Access token which was issued by ABDM session API after successful validation of client id and secret__    

__ __   

__Body parameters __   

Property Name    

Example Value    

Required    

Description    

isApplicableForAllHIPs    

false    

    Yes    

This value can be false or true\. In case of false this will be notified to all the HIPs available in the system and in case of false this will be notified to the specific HIP only    

includedSources    

\[    

        \{    

            "hiTypes": \[    

                "Prescription",    

                "DiagnosticReport",    

                "OPConsultation",    

             "DischargeSummary",    

            "ImmunizationRecord",    

      "HealthDocumentRecord",    

                "WellnessRecord"    

            \]    

Yes    

Included sources will have the list of hi types    

Purpose    

\{    

Yes    

Purpose for rising the consent    

   

                "text": "Care    

Management",    

                "code": "CAREMGT",                    "refUri":    

"www\.abc\.com7"    

            \}    

   

   

Hip    

\[\{    

                "id": "HIP\_ID",    

                "name": "SAI    

KRISHNA"    

            \}    

Optional    

For which HIP consent has been raised 

Categories    

\[    

            "LINK","DATA"    

        \],    

    

Categories available    

Period    

\{    

            "from": "2023\-04\-  04T09:52:39\.235Z",               "to": "2023\-  

0420T09:52:39\.235Z"    

        \}    

    

Period time for approving the subscription    

Excluded sources    

"excludedSources": \[    

        \{    

            "hiTypes": \[    

                "PRESCRIPTION"    

            \],    

            "purpose": \{    

                "text": "Self    

Requested",    

                "code": "PATRQT",                 "refUri":    

"www\.test\.com"    

            \},    

            "hip": \{    

                "id": "",    

                "name": "string"    

            \},    

            "categories": \[    

                "LINK"    

            \],    

            "period": \{    

                "from": "2023\-06\-  

20T05:19:33\.429Z",    

                "to": "2023\-06\-   

30T05:19:33\.429Z"    

            \}    

        \}    

    \]  \}    

    

Optional    

Depending upon the flag selected as 

False or True, values need to be added 

__ __   

__ __   

__Request Body __   

Request Body:__ __   

   

[image removed - see original document]

            "purpose": \{    

                "text": "Self Requested",    

                "code": "PATRQT",    

                "refUri": "www\.test\.com"    

            \},    

            "hip": \{    

                "id": "",    

                "name": "string"    

            \},    

            "categories": \[    

                "LINK"    

            \],    

            "period": \{    

                "from": "2023\-06\-20T05:19:33\.429Z",    

                "to": "2023\-06\-30T05:19:33\.429Z"    

            \}    

        \}    

    \] \}    

    

__ __   

__Response __   

Response:__ __   

\{    

    "subscriptionId": "b6c88154\-995b\-45b0\-b720\-838e357c8192",        "message": "Successfully approved Subscription request"    

\}    

Code: 202 Accepted    

    

### <a id="_Toc213410269"></a>Approve Subscription – Call back    

__URL:__ \{\{callback\}\} /api/v3/hiu/subscription\-requests/hiu/notify __Method:__ Post __Request Headers: __   

__ __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-   

ID    

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

    

Actual time when request was initiated, ISO Date    

   

   

   

time format represents date and time    

X\-CM\-ID    

sbx    

    

Suffix of the  consent manager to which the request was intended   

Authorizati on    

    

Gateway Session Token    

    

ABDM Gateway    

Session Token    

__Body parameters __   

Property Name    

Example Value    

Required    

Description    

SubscriptionRequestId    

    

"57ab7ec0\-ce1a\-4d408cc3\- 66172ac3f6ee",    

    

    

    

    

Status    

GRANTED    

    

    

    

Subscription    

    

\{    

      "id": "b6c88154\-995b\- 

45b0b720\-838e357c8192",    

      "patient": \{    

        "id": "xxxxxxx@sbx"    

      \},      

    

    

Hiu    

    

\{    

        "id": "HIP\_ID",    

        "name": "HIP\_NAME",    

        "type": "HIU"    

      \}      

    

    

Sources    

    

\[    

        \{    

          "hip": \{\},    

          "categories": \[    

            "DATA",    

            "LINK"              \]      

    

    

Period    

\{    

            "from": "2023\-04\-  04T09:52:39\.235Z",               "to": "2023\-  

0420T09:52:39\.235Z"    

        \}    

    

    

__ __   

__ __   

__Response __   

[image removed - see original document]

    

[image removed - see original document]    

### <a id="_Toc213410270"></a>Subscription Request Hiu – on notify    

This is the API that will be invoked by the HIU to notify HIECM that HIU has raised the subscription request\.     

__URL:__ /api/hiecm/subscription\-requests/v3/hiu/on\-notify __Method:__ Post  __Request Headers: __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    

Unique UUID for track the end\-to\-end request transaction    

TIMESTAMP    

2022\-10\-   

06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

Authorization    

Gateway Session Token    

Yes    

__JWT Access token which was issued by ABDM session API after successful validation of client id and secret__    

__Body parameters __   

Property Name    

Example Value    

Required    

Description    

acknowledgement    

\{    

        "status": "OK",           

"subscriptionRequestId":    

"2b8ddd74\-5e5e\-475b8778\-  

21603e05a8b4"    

    \}    

    Yes    

   	1\.    This is the    

acknowledgement    

from the HIU     

response    

\{    

        "requestId": "a4b51f47f70f\-  

4291\-9599\- 8e39b7893cfc"    

    \}           

Yes    

This is the response ID is used from the initiate request ID    

__Request Body __   

Request Body:__ __   

\{    

    "acknowledgement": \{    

        "status": "OK",    

        "subscriptionRequestId": "2b8ddd74\-5e5e\-475b\-8778\-21603e05a8b4"    

    \},    

    "response": \{    

        "requestId": "a4b51f47\-f70f\-4291\-9599\-8e39b7893cfc"    

    \}    

\}    

__Response __   

Response:__ __   

Code: 202 Accepted    

    

### <a id="_Toc213410271"></a>Deny Subscription Request                                                              

This API will be invoke by the patient to deny the subscription request raised by the HIU    

__URL:__ /api/hiecm/subscriptionrequests/v3/\{\{subscription\_id\}\}/deny    

__Method__: Post    

__ __   

__ __   

__ __   

__ __   

__Request Headers: __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-   

ID    

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

X\-  

AUTHTOKEN   

Login JWT Token    

 

Yes    

JWT Authentication token which was issued by ABDM after successful validation of username and password    

Authorizati on    

Gateway Session Token    

Yes    

__JWT Access token which was issued by ABDM session API after successful validation of client id and secret__    

__Body parameters __   

Property Name    

  

Example Value    

Required    

Description    

    

Reason    

    	  

False    

    Yes    

    

	  	__Request Body __   	   	   

Request Body:__ __   

   	   

\{    	   	   

    "reason": "Not authorized"    \}    

__ __   

__ __   

__ __   

__Response __   

Response:__ __   

\{    

    "message": "Successfully denied the subscription request"    

\}    

202 Accepted    

    

### <a id="_Toc213410272"></a>Deny Subscription – Call Back    

This is the API that will be invoked by the patient to deny the subscription request raise by the HIU    

__URL:__ \{\{ call back\}\}/api/v3/hiu/subscription\-requests/hiu/notify __Method:__ Post __Request Headers: __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-   

ID    

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

Authorizati on    

    

Gateway Session Token    

    

ABDM Gateway Session Token    

__ __   

__ __   

__ __   

__ __   

__ __   

__ __   

__ __   

__Body parameters __   

Property Name    

Example Value    

Required    

Description    

    

notification    

    

    

\{    

    "subscriptionRequestId":   

"5f3ed8a6\-7d1f\- 

48cbbbb0b87313798526",    

    "reason": "Not required",    

    "status": "DENIED"    

  \}    

    

    

    

    

    

__Response __   

Response:__ __   

\{    

    "notification": \{    

        "subscriptionRequestId": " 5f3ed8a6\-7d1f\-48cb\-bbb0\-b87313798526",         "reason":  "Not authorized1",           "status": "DENIED"    

    \}   \}    

202 Accepted    

[image removed - see original document]     

### <a id="_Toc213410273"></a>Edit Subscription    

This is the API that will be invoked by the patient/user from PHR application to edit the subscription\.    

__URL:__ /api/hiecm/subscription\-   

requests/v3/patients/\{\{approved\_subscription\_id\}\} __Method:__ PUT __Request Headers: __   

Property Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction    

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds     

X\-AUTH\-TOKEN    

Login Token    

Yes    

JWT Authentication token which was issued by ABDM after    

successful validation of username and password    

Authorization    

Gateway Session Token    

Yes    

JWT Access token which was issued by ABDM session API after successful validation of client id and secret    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

__ __   

__ __   

__ __   

__ __   

__ __   

__ __   

__ __   

__ __   

__ __   

__Body Parameters:  __   

Property Name    

Example Value    

Required    

Description    

hiuId    

    

MOHAN\-HIU    

    

    Yes    

HIU who raised the request\.     

   

subscriptionEditAndApprovalRequest    

    

"includedSources": \[    

            \{    

                "hiTypes": \[    

                       

"PRESCRIPTIONs"    

                \],    

                "purpose": \{    

                    "text": "Care    

Management",    

                    "code": "",             "refUri":    

"www\.amazon\.com"    

                \},         

Yes    

Hi types, purpose should be mentioned while editing the subscription    

Hip    

\{    

                    "id":    

"HIP\_ID",    

                    "name":   

"HIP\-NAME"                  \},      

Yes    

For which HIP requested was initiated    

    

“categories"    

    

LINK    

    

Yes    

Categories can be DATA and LINK     

Period    

\{    

                    "from":    

"2023\-06\-   

24T04:03:40\.079Z",    

                    "to": "2023\-   

06\-27T04:03:40\.079Z"    

                \}    

    

Yes    

From when the subscription should be available    

excludedSources    

    

\[    

            \{    

                "hiTypes": \[    

                       

"PRESCRIPTION"    

                \],    

                "purpose": \{    

                    "text": "Self    

Requested",    

                    "code":    

"PATRQT",    

                    "refUri":    

"www\.amazon\.com"    

optional    

    

   

                \},    

                "hip": \{    

                    "id": "HIP\-ID",       

"name":    

"HIP\-NAME"                  \},    

                "categories": \[    

                    "LINK"    

                \],    

                "period": \{                 

"from":    

"2023\-06\-   

23T05:19:33\.429Z",    

                    "to": "2023\-   

06\-30T05:19:33\.429Z"    

                \}    

            \}    

        \]    

    \}  \}    

    

   

  

  

   

__Request Body:  __   

Request Body:__ __   

 

 

    

"hiuId": "HIU\_ID",    

"subscriptionEditAndApprovalRequest": \{    

        "isApplicableForAllHIPs": true,    

        "includedSources": \[    

            \{    

                "hiTypes": \[    

                    "DiagnosticReport",    

                    "Prescription",    

                    "ImmunizationRecord",    

                    "DischargeSummary",    

                    "OPConsultation",    

                    "HealthDocumentRecord",    

                    "WellnessRecord"    

                \],    

                "purpose": \{    

                    "text": "Care Management",                       code": "CAREMGT",    

                    "refUri": "www\.abdm\.gov\.in"    

                \},    

                "categories": \[    

                    "DATA",    

                    "LINK"    

                \],    

                "period": \{    

                    "from": "2024\-01\-09T09:00:00\.000Z",    

                    "to": "2123\-12\-31T09:00:00\.000Z"    

[image removed - see original document]                

 \}    

  

[image removed - see original document]            

 \}     

 

\] 

" 

\}       

    

  

 ,    

 excludedSources": \[\]  	   

[image removed - see original document][image removed - see original document][image removed - see original document][image removed - see original document]\{

[image removed - see original document][image removed - see original document][image removed - see original document]    

    

"

\}  

    

__Response __   

Response:__ __   

Code: 202 Accepted    

\{    

    "subscriptionId": "f9ca6ad7\-ba8f\-4257\-b7ad\-935a82a94480",       

"message": "Successful creation of Subscriptions"    

\}    

    

### <a id="_Toc213410274"></a>Edit Subscription – call back    

This is the API that will be invoked by the patient to deny the subscription request raise by the HIU    

__URL:__ \{\{ call back\}\}/api/v3/hiu/subscription\-requests/hiu/notify __Method:__ Post __Request Headers: __   

__ __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-   

ID    

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

Authorizati on    

    

Gateway Session Token    

    

ABDM Gateway Session Token  

__ __   

__ __   

__Body parameters __   

Property Name    

Example Value    

Required    

Description    

    

notification    

    

    

\{    

    "subscriptionRequestId":   

"5f3ed8a6\-7d1f\- 

48cbbbb0b87313798526",    

    "reason": "Not required",    

    "status": "DENIED"    

  \}    

    

    

    

    

__Response __   

Response:__ __   

\{    

    "notification": \{    

        "subscriptionRequestId": " 5f3ed8a6\-7d1f\-48cb\-bbb0\-b87313798526",         "reason":  "Not authorized1",    

        "status": "DENIED"    

    \}   \}    

202 Accepted    

[image removed - see original document]     

### <a id="_Toc213410275"></a>Subscription HIU –notify    

This is the API that will be invoked by the HIU to notify by HIECM about the for link new record\.    

__URL:__ \{\{ call back\}\} /api/v3/hiu/subscription/notify    __Method:__ POST    

__Request Headers: __   

Property Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-479dad71\-  

7a57d5f669a8    

Yes    

Unique UUID for track the end to end request transaction__ __   

TIMESTAMP    

2022\-10\-06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds__  __   

Authorization    

Gatteway Session Token    

Yes    

ABDM Gateway Session Token    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

__Body Parameters:  __   

Property Name    

Example Value    

Required    

Description    

Event \-   

SubscriptionRequestId    

    

"57ab7ec0\-ce1a\-4d408cc3\- 66172ac3f6ee",    

    

    

    

    

Event\-id    

17fb377f\-8675\-402f\-9c1b\-   

3e8857ef1fc8    

    

    

Event\- published    

"2024\-08\-09 09:03:07\.059"    

    

    

Event\- category    

"LINK"    

    

    

Content\- patient    

\{    

        "id": "abha@sbx"    

      \}    

    

    

Content\- hip    

\{    

        "id": "HIP\_ID"    

      \}    

    

    

Content\- careContexts    

\[    

            \{    

              "patientReference":    

"xxxxxx@sbx",    

                 

"careContextReference":   

"db4423d5\-62f7\-44f887d2\-  

5fcb25c5a814"    

            \}    

    

    

   

          \]     

   

   

Content\- hiTypes    

"Prescription"     

    

    

__Request Body:  __   

Request Body:__ __   

\{    

  "event": \{    

    "id": "17fb377f\-8675\-402f\-9c1b\-3e8857ef1fc8",    

    "published": "2024\-08\-09 09:03:07\.059",    

    "subscriptionId": "b6c88154\-995b\-45b0\-b720\-838e357c8192",    

    "category": "LINK",    

    "content": \{    

      "patient": \{    

        "id": "abha@sbx"    

      \},    

      "hip": \{    

        "id": "HIP\_ID"    

      \},          "contexts": \[    

        \{    

          "careContexts": \[    

            \{    

              "patientReference": "abah@sbx",    

              "careContextReference": "db4423d5\-62f7\-44f8\-87d2\-5fcb25c5a814"    

            \}    

          \],    

          "hiType": "Prescription"    

        \}    

      \]    

    \}    

  \}     

    	 

 

[image removed - see original document][image removed - see original document]    

    	    	   	  	 

### <a id="_Toc213410276"></a>Subscription HIU –On\-notify    

This is the API that will be invoked to HIU to notify HIECM about the link new record notification received\.    

__URL:__ /api/hiecm/subscription\-requests/v3/hiu/care\-context/on\-notify __Method:__ Post __Request Headers: __   

Property    

Name    

Example Value    

Required    

Description    

REQUEST\-ID    

18235d89\-cb13\-   

479d\-ad717a57d5f669a8    

Yes    

Unique UUID for track the end\-to\-end request transaction    

TIMESTAMP    

2022\-10\-   

06T10:10:00\.587Z    

Yes    

Actual time when request was initiated, ISO Date time format represents date and time    

X\-CM\-ID    

sbx    

Yes    

Suffix of the consent manager to which the request was intended    

Authorization    

Gatteway Session Token    

Yes    

__JWT Access token which was issued by ABDM session API after successful validation of client id and secret__    

__ __   

__Body parameters __   

Property Name    

Example Value    

Required    

Description    

acknowledgement    

\{    

        "status": "OK",    

        "eventId": "2b8ddd74\-   

5e5e\-475b\-877821603e05a8b4"   

    \}    

    

Yes     

This is the acknowledgement from the HIU     

Response    

\{    

        "requestId": "a4b51f47f70f\-  

4291\-9599\- 8e39b7893cfc"    

    \}           

Yes    

This is the response ID is used from the initiate request ID    

__ __   

__ __   

__ __   

__ __   

__ __   

__Request Body __   

Request Body:__ __   

\{    

    "acknowledgement": \{    

        "status": "OK",    

        "eventId": "2b8ddd74\-5e5e\-475b\-8778\-21603e05a8b4"    

    \},    

    "response": \{    

        "requestId": "a4b51f47\-f70f\-4291\-9599\-8e39b7893cfc"    

    \}    

\}    

__Response __   

Response:__ __   

Code: 202 Accepted    

    

     

           

           

           

      

     

    

# <a id="_Toc213410277"></a>API listing__ __   

No\. 

  __Flow__    

__Serial__    

__v3 API__    

__Description__    

    

Subscripti on    

4\.1    

/api/hiecm/subscriptionrequests/v3/requests?statu s=ALL&limit=10&offset=0    

API will be invoked by the patient/user from the PHR application to fetch his/her subscribed HIU details    

    

__ __   

4\.2    

/api/hiecm/subscriptionrequests/v3/init    

API which will be invoked by the HIU to initiate subscription request to the patient/user from PHR application    

    

__ __   

4\.3    

\{\{call    

back\}\}/api/v3/hiu/hiecm/s ubscriptionrequests/oninit    

API which will be invoked by the HIU to initiate subscription request to the patient/user from PHR application\.     

In these two calls back will be received one by the HIU that request has been raised with the subscription request id and other will be received by the patient if patient is registered in the PHR app/health locker    

   

    

__ __   

4\.4    

/api/hiecm/subscriptionrequests/v3/hiu/on\-notify    

API that will be invoked by the HIU to notify HIECM that HIU has raised the subscription request    

    

__ __   

4\.5    

/api/hiecm/subscriptionrequests/v3/\{subscription\_r equestid\}/approve    

Api will be invoked by the patient/user from PHR application to approve the subscription request raised by the HIU    

    

__ __   

4\.6    

\{\{callback\}\}    

/api/v3/hiu/subscriptionrequests/hiu/notify    

HIECM will notify to the HIU about subscription request raised by the HIU is approved    

    

__ __   

4\.7    

/api/hiecm/subscriptionrequests/v3/hiu/carecontext/onnotify

api will be invoke by the HIU to notify HIECM about the subscription request has been approved or denied    

 

    

__ __   

4\.8    

 /api/hiecm/subscriptionrequests/v3/\{subscription\_i d\}\}/deny 

api will be invoke by the HIU to notify HIECM about the subscription request has been approved or  denied    

 

    

__ __   

4\.9    

\{\{ call    

back\}\}/api/v3/hiu/subscript ion\-requests/hiu/notify    

api will be invoke by the patient to deny the subscription request raise by the HIU    

    

__ __   

4\.\.10    

/api/hiecm/subscriptionrequests/v3/patients/\{subs cription\_id\}    

API will be invoked by the patient/user from PHR application to edit the subscription\.    

    

__Consent Flow __   

4\.11    

/api/hiecm/consent/v3/req uest/init    

API used to raise consent request    

    

__ __   

4\.12    

\{callback\}/api/v3/hiu/cons ent/request/on\-init    

Callback API used to notify hiu    

    

__ __   

4\.13    

/api/hiecm/consent/v3/req uest/status    

API used to fetch the status of consent request    

    

__ __   

4\.14    

\{callback\_url\}/api/v3/hiu/c onsent/request/on\-status    

Callback api is used to give the response of 

status    

    

__ __   

4\.15    

/api/hiecm/consent/v3/fetc h    

API used to fetch the consent details    

    

__ __   

4\.16    

\{callback\_url\}    

/api/v3/hiu/consent/onfetch    

Callback api used to give a response of fetch api   

    

__Data flow __

  	4\.17

/api/hiecm/dataflow/v3/healthinformation/request    

This api indicates the exchange of health data request from HIU to HIP    

    

__ __   

4\.18    

\{callback\_url/api/v3/hiu/he alth\-information/onrequest    

callback API for acknowledgment of Health information request of HIU\. CM calls this API when it has validated the Health Information request given the consent id\. •   

   	Either the  

hiRequest or  error would need to be specified\. If the health info request was valid, then the hiRequest\.transactionId specifies the transaction context against which HIP would send over the data   

 

 

 

 

API will be called by HIU and HIP to notify the CM about the status of the data transfer\.    

    

HIP on the transfer of data would send sessionStatus \- one of \[TRANSFERRED, FAILED\]\. HIP would also send hiStatus for each careContextReference \- on of    

\[DELIVERED, ERRORED\]    

•    	    

HIU on receipt of data would send sessionStatus \- one of \[RECEIVED, FAILED\]\. For example, ERRORED when data was not sent or if invalid data was sent\. HIU would also send hiStatus for each  careContextReference \- one of \[OK, ERRORED\]\.    

    

__ __   

4\.19    

/api/hiecm/dataflow/v3/healthinformation/notify    

 

    

    

7 Error codes listing__ __   

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

You have requested multiple OTPs Or Exceeded  maximum number of attempts for OTP match in this transaction\.  

Please try again in 30 minutes\.     

ABDM\-1006     

Bad Request, invalid request Body     

ABDM\-1110     

ABHA User not found\.     

ABDM\-1111     

Mobile number not found\.     

ABDM\-1112     

Aadhaar details not found\.     

ABDM\-1113     

Login via Password is not allowed     

ABDM\-1114     

Login via ABHA Number OTP is not allowed     

ABDM\-1115     

Login via Aadhaar OTP is not allowed     

ABDM\-1102     

Mobile number verification is pending\.     

ABDM\-1203     

\{errors coming from DL gateway\(Nepix\)\}     

ABDM\-1204     

\{errors coming from Aadhaar gateway\(UIDAI\)\}     

    


