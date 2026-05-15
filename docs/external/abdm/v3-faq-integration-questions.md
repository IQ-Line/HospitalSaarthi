# FAQ - Integration Questions

> Source: ABDM Sandbox V3 Documentation
> File: FAQ_20_11_2025_808a25df64.pdf

# Commonly Asked Questions 

 (Frequently asked technical queries) 

 Integrator Guide 

 ABDM ABHA V3 APIs 

 Version 1.1 

**Version history:** 

 Version Release Date Nature of Changes Draft 18 Mar 2025 Document approved 1.0 27 May 2025 Revision of Base URL links 1.1 13 Jun 2025 Added FAQ related to Facility set-up 1.2 31 Jul 2025 Added FAQs on ABHA address verification error, HIP notify callback issue, and facility registration process 1.3 19 Aug 2025 Added FAQ on callback URL configuration issue (extra API endpoint appended) 1.4 20 Nov 2025 Added FAQ for error code ABDM-1227 (Maximum limit of 100 ABHA creations per client ID) 



---

**1. What is the difference between bridge-id and client-id?** (Milestone 1) 

**Solution:** Both bridge-id and client-id are same which are used for authenticating an entity or user while communicating with ABDM. 

**2. Which HI Types are mandatory for each ABDM participant category?** (Milestone 1)     **Solution:**        **S. No. Category Mandatory HI Types**           1 HMIS All 8 HI Types are mandatory 

1. Prescription 

2. DiagnosticReport 

3. OPConsultation 

4. DischargeSummary 

5. ImmunizationRecord 

6. HealthDocumentRecord 

7. WellnessRecord 

8. Invoice     * If ABDM introduces any additional HI Types, they must also be     implemented. 2 LMIS HI types applicable as per business case for M2. 3 Pharmacy Invoice (Mandatory) / others as applicable according to business case. 4 PHR App / Health Locker / Health Worker 

 All 8 HI Types mandatory 

 5 Insurance / TPA / Claim Exchange 

 If implementing M3, then all HI Types are mandatory to showcase (render) the patient data 

 6 Technology Solutions Provider (DSC Digital solution companies) 

 HI as per the business case and milestone involved 

 Note: 

**1.** If ABDM introduces any additional HI Types, they must also be implemented. 

**2.** Kindly refer to Webinar 12 under the Resources tab for a better understanding of the HI types     involved and the FHIR structure (https://sandbox.abdm.gov.in/sandbox/v3/webinars) 



---

**3. Base URLs for the sandbox and production instances.** (Milestone 1, 2 and 3) 

**Milestone** (^) **Base URL** (API version **v3** ) **Environment** Session API https://dev.abdm.gov.in/api Sandbox https://apis.abdm.gov.in/api Production M1 https://abhasbx.abdm.gov.in/abha/api Sandbox https://abha.abdm.gov.in/api/abha Production M1 (ABHA address verification) https://abhasbx.abdm.gov.in/abha/api/v3/phr/web Sandbox https://phr.abdm.gov.in/api/phr/web/v3 Production M2 and M3 https://dev.abdm.gov.in/api Sandbox https://apis.abdm.gov.in/api Production PHR https://abhasbx.abdm.gov.in/abha/api/v3/phr/app/ Sandbox https://phr.abdm.gov.in/api/phr/web/v3/ Production Register bridge URL https://dev.abdm.gov.in/api/hiecm/gateway/v3/bridge/url Sandbox The Callback URL must be specified when submitting the Exit Form. **_Please note_** _:_ The Exit Form should be filled only after successful completion of FT and WASA certification, along with the internal demo by NHA. If the Callback URL needs to be changed at a later stage, please contact the ABDM Integration Support Team. Production 

**4. Why does an "Unauthorized" error appear when calling an API?** (Milestone 1) 

 Solution : Whenever you encounter this error, kindly check your access token. While passing it in authorization, you have to pass it with Bearer as prefix, even if the token expires this unauthorized error occurs. It Should look like example, Authorization: Bearer eyJhbGciOiJSUzI1NiIs……. 

**5. What value should be passed in the ‘X-CM-ID’ attribute in the API request headers?**     (Milestone 1) 

 Solution : If you are working in sandbox then header will be 'X-CM-ID: sbx’ but if you are working in production then the header will be ‘'X-CM-ID: abdm' 

**6. Is there a specific format for the timestamp mentioned in the request body of the APIs**     **where Key is “timestamp”?** (Milestone 1) 

 Solution : APIs that require a timestamp, use the current ISO timestamp at zero UTC in the format: YYYY-MM-DD’T’HH:MM.SS.SSS’Z’. For example, 2024-05-20T11:29:27.358Z. The correct structure for the timestamps in the "dateRange" field must be implemented. 

**7. What format should the REQUEST-ID be in for V3 APIs?** (Milestone 1) 

**Solution:** The REQUEST-ID should be a random 36-character UUID, such as 'd9f1a2c2e3b6499f8c2d-071b13ba85ab'. 



---

 8.What happens if incorrect headers are passed in API (REQUEST-ID, TIMESTAMP, X-CM-ID)? (Milestone 1) 

**Solution:** If incorrect headers are provided in the API, the response will typically result in an "Access Denied" error. To resolve this, ensure that all required headers are correct and properly formatted before sending the request again. 

**9. How to encrypt Aadhaar and mobile in the Milestone-1 API? Is there any sample code available?** (Milestone 1) 

 Solution: Yes, the Retrieve Public Key for RSA Encryption API must be used to generate a public key, which will be required for the encryption process: 

 API Endpoint:-(https://healthidsbx.abdm.gov.in/api/v3/auth/cert) The encryption algorithm used is RSA/ECB/OAEPWithSHA-1AndMGF1Padding. 

 For testing purposes, refer to this online RSA encryption tool: https://www.devglan.com/online-tools/rsa-encryption-decryption For sample Java code, refer to the official documentation: https://sandbox.abdm.gov.in/sandbox/v3/newdocumentation?doc=EncodingAndEncryption) 

**10. I am facing issue as invalid login Id in response as below. How to resolve this?** (milestone 1)     {        "loginId": "Invalid LoginId",        "timestamp": "2024-05-29 17:24:01"     } **Solution** : Make sure you retrieve the public key API and use Cipher type as “RSA/ECB/OAEPWithSHA-1AndMGF1Padding” for V3 APIs and then you can pass the encrypted output     in the required field in the payload. 

**11. Please guide on V3 RSA encryption steps.** (Milestone 1) **Solution** : RSA Encryption, Decryption And Key Generator Online | Devglan This tool can be used for RSA encryption and decryption as well as to generate RSA key online.     Both public and private keys can be generated for free. 

 Encryption Steps : For V3 Devglan RSA: https://www.devglan.com/online-tools/rsa-encryptiondecryption 

 1) Enter Plain Text to Encrypt 

 2) Enter Public/Private key (API URL for public key generation: curl curl --location 'https://abhasbx.abdm.gov.in/abha/api/v3/profile/public/certificate' \ --header 'REQUEST-ID: 700293bb-4db1-4039-8a32-122484e577b6' \ --header 'TIMESTAMP: 2025-03-05T05:46:16.289Z' \ --header 'Authorization: Bearer eyldxRjQfYPsCg' 

 3) RSA Key Type: Public key 

 4) Select Cipher Type: RSA/ECB/OAEPWithSHA-1AndMGF1Padding 



---

 Click on Encrypt 

**12. How many Abha addresses can be created and linked with a particular ABHA number?**     (Milestone 1) 

**Solution** : There can be 6 ABHA Addresses which can be linked to a single ABHA number. 

**13. How many Abha Number can be linked with one mobile number?** (Milestone 1) **Solution** : There can be six ABHA number which can be attached to one mobile number. 

**14. Why we are receiving the following error: "error": {**     **"code": "ABDM-1227",**     **"message": "This client ID has reached the maximum limit of 100 ABHA account creations." }** (Milestone 1) **Solution** : ABDM allows a maximum of **100 ABHA creations per client ID** in the sandbox environment. This limit is sufficient for testing purposes. If you have exceeded the limit, you can **delete existing ABHA IDs** from the sandbox portal: https://abhasbx.abdm.gov.in/abha/v3 

**15. Facing CORS related issue, what can be the possible solution.** (Milestone 1) 

 Solution : CORS (Cross-Origin Resource Sharing) error occurs when a web application running in one domain (origin) tries to access resources from a different domain. This is a security mechanism implemented by web browsers to prevent unauthorized access to sensitive data. 

 When you are integrating with another system using an open API, the API server may be configured to only allow requests from specific domains or origins. If your application is not on the list of allowed origins, the API server will reject the request and return a CORS error. 

 To solve this issue, you need to configure your server to allow requests from the domain that your application is hosted on. This can be done by adding the appropriate CORS headers to the API response. Alternatively, you can use a proxy server to make the API request on behalf of your application, which will bypass the CORS restrictions. 

**16. Which API should be used for Demo Auth in V3, and what are the mandatory and optional fields in the request body?** (Milestone 1) 

 Solution: Request URL : 

https://abhasbx.abdm.gov.in/abha/api/v3/enrollment/enrol/byAadhaar(Sandbox) In your Demo Auth API request body, the mandatory fields are: Aadhaar Number (encrypted), date Of Birth, name, gender, state Code, district Code. You can send optional information like mobile, pin code, profile Photo etc. 

**17. How can I update the photo for reapply cases in ABHA for demo auth cases?** (Milestone 1)     **Solution** :     For updating the photo for reapply cases through demo auth, use the following curl command to     update the profile photo in ABHA: 

 curl --location --request PATCH 'https://abhasbx.abdm.gov.in/abha/api/v3/profile/account' \ --header 'X-token: Bearer {{X-Token from Demo Auth}}' \ --header 'REQUEST-ID: 63164aa9-79c1-4820-9b5f8-2966497e203f' \ 



---

 --header 'TIMESTAMP: 2025-02-17T10:08:29.632Z' \ --header 'Content-Type: application/json' \ --header 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInREmvucjC_dd4Fjx-CPRN3oOXGpiRm0uVwmc3Q' \ --data '{ "profilePhoto": "base64_encoded_profile_photo" }' Make sure to replace base64_encoded_profile_photo with the actual base64 encoded string of your profile photo. Also, update the placeholder values such as {{X-Token from Demo Auth}} with the actual values. 

**18. When creating an ABHA through demo auth and sending a photo in the request, the profile photo is not visible in the response?** (Milestone 1)     **Solution** :     If the photo doesn't appear in the response, verify the base64 string and ensure the image format     and size meet the required specifications.     Ensure that the photo size does not exceed 100 KB and is in either PNG or JPG format. The profile     photo should be sent in the request as a base64 encoded string 

**19. We are encountering the following response while accessing the Child ABHA API: "Please ensure that the mobile number is mapped to the parent's ABHA number”?** (Milestone 1)     **Solution** : 

This issue occurs when the parent ABHA number does not have a mobile number linked to it. Please ensure that a valid mobile number is linked to the parent's ABHA account. 

**20. When using bio auth APIs, we are getting error K-547.?** (Milestone 1)     **Solution** : To resolve this issue, use the following attribute values as specified: 

- **lr = 'Y'** (The attribute was previously passed as 'N') The rest of the parameters should remain as is: 

- **ra = deviceType** ; //'F' for fingerprint 

- **rc = 'Y'** 

- **de = 'N'** 

- **pfr = 'N'** To generate the **text** parameter, use the formula: text = '2.5' + ra + rc + lr + de + pfr; Then, perform the following operations: 

1. Convert the **text** to **SHA-256**. 

2. Encode the SHA-256 hash to **Base64** : wadh = Base64.stringify(sha256(text)); 

**21. While verifying using an ABHA address and calling the Get Profile and ABHA Card APIs, we are receiving the following error:** 

**{** 

 "code": "ABDM-1094", "message": "X-token expired", "timestamp": "2025-07-31 12:15:32" 



---

**}** (Milestone 1) 

 Solution: This error typically occurs when the incorrect API is used for ABHA address verification. 

 For verification using ABHA Address , please use the following APIs: 

- **To fetch Profile:**     https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/profile/abha-profile 

- **To download ABHA Card:**     https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/login/profile/abha/phr-card **Note:** For the other three verification flows — **Aadhaar, ABHA Number, and Find ABHA** — and during **ABHA creation** , the correct APIs to fetch profile details and the ABHA card are: 

- **To fetch Profile:**     https://abhasbx.abdm.gov.in/abha/api/v3/profile/account 

- **To download ABHA Card:**     https://abhasbx.abdm.gov.in/abha/api/v3/profile/account/abha-card 

 Make sure you are using the appropriate token and API based on the specific verification method to avoid the "X-token expired" error. 

**22. How can I register my facility in the sandbox environment or obtain a HIP-ID/HIU-ID?** (Milestone 1) 

 Solution: To register your facility in the sandbox environment, please visit the sandbox portal: https://hspsbx.abdm.gov.in/home. Once your facility is registered, you will receive a HIP-ID or HIUID , which can be used for integration purposes. 

 A user manual for facility creation and QR code generation is available on the same website under the "Resource Center" section. Navigate to User Manual > Health Facility for detailed steps. 

 You can use the same facility ID for both roles — as a HIP in the M2 case and as a HIU in the M3 case. There is no need to create separate facility IDs for each role unless you specifically need to. After creating the facility, use the "Software Linkage" button on the portal to link your facility ID with your client ID. 

 Note: When you visit the sandbox site, a pop-up message will appear stating: Testing Environment This is a testing portal. If you are a Registered Medical Practitioner, kindly register yourself on https://nhpr.abdm.gov.in/home 

 Click "Close" to proceed with creating a facility in the sandbox environment. If you intend to register a facility in the production environment , then only click "Visit NHPR" on the pop-up. This will redirect you to the production portal: https://nhpr.abdm.gov.in/home. 

 Important: Please ensure that sandbox facilities are used strictly for testing purposes, and production facilities are used exclusively for live deployments. Mixing these environments can lead to integration issues. 

**23. How can I link my registered facility with my client ID?** (Milestone 1) 



---

 Solution: Once the facility is registered via the UI, you do not need to use the multipleHrPaddupdateService API to link it with your client ID. Instead, you can use the Software Linkage button. After logging into your facility on the website, click on Software Linkage and pass the client ID to complete the process. 

**24. Can a facility have multiple service providers/ Bridge IDs in ABDM?** (Milestone 1)     **Solution:**     Yes, a health facility registered in the ABDM ecosystem (identified by its HFR ID) can be linked with     multiple service providers, each operating through a unique Bridge ID.     In this model: 

- Each Bridge ID represents a separate service provider or technology partner. 

- When a facility (HFR ID) is linked to a specific Bridge, a unique HIP ID (Health Information     Provider ID) is generated for that combination. 

- As a result, the same facility can have multiple HIP IDs, each corresponding to a different     Bridge ID. 

 Facility (HFR ID) Bridge ID HIP ID 

 IN0710000001 

## SBXID_000001 IN0710000001 

## SBXID_000002 IN0710000001_1 

 This allows a facility to use digital health services from different platforms at the same time, like one for hospital data, another for lab reports, and a third for pharmacy records, all within the ABDM system. There are no data conflicts or duplication, as each HIP ID is separate and linked to its own Bridge. 

**25. Can a facility have multiple HIP IDs?** (Milestone 1)     **Solution:** Yes, a facility can have multiple HIP IDs, one for each service provider(Bridge IDs) it is linked to. 

**26. Is it necessary to remove an existing service provider before adding a new one for the same facility?** (Milestone 1)     **Solution:**     No, a facility can work with multiple service providers simultaneously. Existing configurations do not     need to be removed unless the facility specifically wants to discontinue a provider. 

**27. In Scan and share – Error as HIP ID is currently experiencing some issue, please try again later. What might be the issue?** (Milestone 1) 

Solution: The issue is with the profile on-share response body. Make sure right parameter is passed in the on-share body as this is done from HIP side and profile share is done from PHR user side. Sharing the CURL for profile /on-share 

curl --location 'https://dev.abdm.gov.in/hiecm/api/v3/patient-share/on-share' \ --header 'REQUEST-ID: 43668174-d807-4051-8562-5a01777ca3ac' \ --header 'TIMESTAMP: 2024-06-25T09:01:12.564Z' \ --header 'X-CM-ID: sbx' \ --header 'Content-Type: application/json' \ --data-raw '{ "acknowledgement": { 



---

 "status": "SUCCESS", "abhaAddress": "abhaadd@sbx", "profile": { "context": "10", "tokenNumber": "55", "expiry": "600" } }, "response": { "requestId": "a289ca31-97f8-4e3b-aa02-545b6374388b" } }' 

**28. Why are we receiving a mobile number in the VerifyAadhaarOTP response, even when it doesn't match the Aadhaar-linked mobile?** (Milestone 1) 

**Solution** : If a mobile number is returned in the response, it indicates that the ABHA is already created. To update the mobile number, use the **Update Mobile Number API** (/enrollment/request/otp) 

**29. Not getting call back on my server?** (Milestone 2) 

**Solution:** Please ensure the following: 

1. **Callback URL** : The callback URL should use a **domain name** , not an IP address or port     number. 

2. **Server Location** : Verify that your server is India-based, as required. 

3. **IP Whitelisting** : Ensure the IP address NAT IPs: **13.203.243.253, 13.203.245.166,**     **65.0.113.207, 14.143.232.140** is whitelisted in your server configuration or firewall     settings. 

4. **Firewall Rules** : Check your firewall rules to confirm they are not blocking incoming     requests from the mentioned IP address. 

5. **Application Routing** : Situation where requests or data are not directed to the intended     destination within the application. Please ensure that 

- URL paths or endpoints are properly and correctly configured 

- Mismatch Between Frontend and Backend Routes 

- Microservices Misrouting 

- Load balancers or API gateways may misroute due to incorrect rules or policies     (port number configuration, services enable/disable) 

- incorrect version of an endpoint due to mismatched routing configurations **Example scenarios** : 

- A user tries to access `/user/profile`, but due to misrouting, it ends up hitting     `/admin/dashboard`. 

- An API call to fetch patient data is routed to a billing service instead of the     health record service. 

- In the ABHA application context, a service call for authentication might be     misrouted to a registration endpoint. 

**30. Why are we not receiving the callback on our callback URL?** (Milestone 2) 

**Solution:** 

- **Cause:** While registering your callback URL using     https://dev.abdm.gov.in/api/hiecm/gateway/v3/bridge/url , you included the API 



---

 endpoint (/api/v3/hip/token/on-generate-token ) instead of just the base URL. As a result, the system appends the path again, generating a URL like: https://xyz.com/CallbackResponse.aspx/api/v3/hip/token/on-generatetoken/api/v3/hip/token/on-generate-token 

- **Solution:** Register only the **base URL** in the callback setup (e.g.,     https://xyz.com/CallbackResponse.aspx ) and not the complete API endpoint (e.g.,     https://xyz.com/CallbackResponse.aspx/api/v3/hip/token/on-generate-token ). 

**31. Why is there a "You are blocked for 24 hours" message in the on-generate token callback while hitting generate token API?** (Milestone 2) 

 Solution : If the generate token API is called for the same ABHA address by the same facility more than three times in a single day, a "You are blocked for 24 hours" message will be returned in the on-generate token callback. The linking token is valid for 6 months, so this API does not need to be repeatedly called for the same ABHA address. 

**32. Is the ABHA number mandatory in /v3/link/carecontext?** (Milestone 2) **Solution** :     **Case 1: When ABHA number is passed in the generate-token API**        If you pass the ABHA number in the generate-token API,        then you must pass it in /v3/link/carecontext. 

 Case 2: When ABHA number is NOT passed in the generate-token API If you do not pass the ABHA number in the generatetoken API, then you do not need to pass it in /v3/link/carecontext. 

**33. Is it possible to unlink care contexts linked to an ABHA)?** (Milestone 2) 

**Solution:** No, care contexts **cannot be unlinked or deleted** once linked. 

**34. Do we have to implement the logic behind the user-initiated linking?** (Milestone 2) 

**Solution** : **Yes, you need to build the logic in your system to fetch the correct health records (care contexts) based on the details received in the Discover API response.** You can refer to the sample logic in the documentation, but the actual implementation will depend on how your system stores and manages patient data. 

**35. Who will send the OTP in discovery flow?** (Milestone 2) 

**Solution** : 

 The HIP is responsible for sending the OTP to the user during the discovery flow. 

**36. Not receiving health information/hip request callback. What can be possible reason?**     (Milestone 2) **Solution** : The most common reason for not receiving the health-information/hip/request     callback is a delay in sending the on-notify response or passing incorrect data. 



---

 You must send the on-notify within 60 seconds of receiving the /hip/notify callback. 

 Also, this callback depends on the HIU initiating the data request. If the HIU does not request the data, the HIP will not receive the health-information/request callback. 

**37. Steps for validating FHIR bundle:** (Milestone 2) 

 Solution : Below are the steps to validate any ABDM/NHCX FHIR bundle: (i) Create a folder at your desired location and download the validator_cli.jar of the mentioned version https://github.com/hapifhir/org.hl7.fhir.core/releases/download/6.2.1/valid ator_cli.jar and keep the jar in this folder location. (ii) This is Java based command line application and requires minimum JDK 8. (iii)Download the required JSON file from the NRCeS example sections. You can do so by selecting a given example, navigating to the JSON tab and clicking download button provided. Alternatively, you can also all the FHIR JSON created for your implementation. (iv) Now enter the below command java -jar <validator_cli.jar file name> <Bundle JSON file name> ig https://nrces.in/ndhm/fhir/r 4 (v) Run this command from the command prompt or any other CLI application. (Go to the folder, right click and select the Note: We recommend using system generated URN:UUID in the bundle resource reference instead of a relative URL. 

**38. Are there any specific APIs to create a FHIR bundle, or should it be created manually**     **using user inputs?** (Milestone 2) 

**Solution** : There are **no APIs** to create a FHIR bundle. FHIR is a **standard format** used for interoperability, and the bundle must be created manually based on input data. 

You can refer to **Webinar 12** for guidance on FHIR bundle creation: Link:(132) Understanding health record creation in FHIR format #ABDM #DigitalHealth YouTube 

**39. What are the steps to complete the data transfer flow by the HIP in Milestone 2?**     (Milestone 2)        **Solution** 

 Step 1: Once you receive a /hip/notify callback, you need to send an acknowledgment via on-notify. 

 Step 2: After that, you will receive a request callback, which will include the dataPushUrl and encryption keys. You must then send the on-request acknowledgment and push the encrypted data to the provided dataPushUrl. 

 Step 3: Data Preparation Steps 

1. Create a FHIR bundle as per the NRCES FHIR guidelines. 

2. Convert the FHIR JSON to a string format. 

3. Encrypt the string using the keys provided in the hip/request callback from the     HIU. **Step 4:** Push the encrypted bundle to the dataPushUrl received in the hip/request callback. 



---

 Step 5: Call the /api/hiecm/data-flow/v3/health-information/notify API to notify the ABDM HIECM about the data transfer. 

**40. What is the encryption algorithm used in data transfer?** (Milestone 2) 

**Solution :** The facility should use “Elliptic-curve Diffie–Hellman Key Exchange (ECDH)” algorithm for encryption and decryption, for references you can follow the webpage, (https://sandbox.abdm.gov.in/sandbox/v3/newdocumentation?doc=ImplementationGuidelines) 

**41. How can the care Context Reference be connected with a FHIR Bundle (User Uploaded**     **Documents)?** (Milestone 2) 

 Solution In FHIR, the "Care Context" or "Encounter" is an important resource that represents an interaction between a patient and a healthcare provider. To connect the Care Context Reference with a FHIR Bundle, you can include the Encounter resource within the Bundle's "entry" array. Please refer to FHIR webinar uploaded on webpage, https://sandbox.abdm.gov.in/webinars 

Also, while transferring the data, you must include the careContextReference in the data push API request, corresponding to the encrypted FHIR bundle. 

**42. Can we send both FHIR as multiple entries with same careContext?** (milestone 2) 

**Solution: Yes, in the data push API, you can include multiple encrypted FHIR bundle objects in the entries array, each with its corresponding careContextReference**. 

**43. How to check the records for Milestone 2.** (Milestone 2) 



---

 Solution: You can use the Sandbox ABHA PHR App to view the health records shared by your HIP, as required for checking records in Milestone 2 

 Download the Sandbox ABHA App: https://sandbox.abdm.gov.in/sandbox/v3/new-documentation?doc=SandboxABHAapp 

 (Note: Please keep checking regularly, as the PHR app receives updates from time to time.) 

 Access the PHR Web Portal: https://phrsbx.abdm.gov.in/phr/v3 

**44. What is the difference between structured and un-structured data?** (Milestone 2) 

**Solution** : The data which is presented in the form of key value json pairs is structured and whereas un-structured is pdf and documents. 

**45. Why is it important to validate and stringify a FHIR bundle correctly and how to check FHIR is properly stringify?** (Milestone 2) 

**Solution:** If a FHIR bundle is not validated and stringified properly, it can cause issues during encryption and decryption. Incompatibilities in the string format, such as improperly closed backslashes ('\'), may prevent data from being processed correctly, leading to failures in data transmission. To check if a FHIR resource is properly stringified, use a JSON validator to identify syntax errors and ensure proper escaping of special characters. Validate the stringified resource against FHIR specifications using tools like HAPI FHIR. Finally, deserialize the string back to an object and compare it to the original to confirm consistency. 

**46. Why FHIR bundle not displaying correctly in the PHR app?** (Milestone 2)     **Solution:**        **User Issue Possible Reason Solution Bundle is not visible in the PHR app** 

1. **Encrypted data is**     **not correctly**     **encrypted** – Incorrect     or mismatched keys     might have been used. 

 ✅ Check if the keys are correctly passed. ✅ Refer to Fidelius GitHub for encryption guidelines and for key usage in the README file. 

2. **JSON conversion to**     **string is incorrect.** 

 ✅ Convert the string back to JSON to validate its correctness. 

3. **Mandatory fields are**     **missing, or an**     **improper bundle is**     **passed.** 

 ✅ Validate the bundle using the following steps: 

- Create a folder at your desired location. 

- Download the validator_cli.jar (Version 6.2.1) and place it in the folder. (Requires JDK 8 or above) 

- Download a sample JSON from NRCeS examples. 

- Run the command: java -jar <validator_cli.jar> <Bundle JSON file> -ig https://nrces.in/ndhm/fhir/r4 in the CLI. 

- Use **system-generated URN:UUID** in the bundle resource reference instead of a relative URL. ✅ Refer to examples: Invoice Record, 



---

 Sample Bundle, Pharmacy Invoice, Charge Item. Bundle is visible in the PHR app, but fields show "NA" 

1. **A required or**     **expected data**     **element in the FHIR**     **bundle is absent or**     **has a null value.** 

 ✅ Ensure that all required data elements are present and not null to prevent "NA" from appearing as a placeholder. 

**47. Consent request is created in HIS application, and the same request has been displayed**     **in ABHA mobile app. However, ‘Grant’ consent button is disabled in PHR app. Error "There is**     **no facility available to share the health records within given information request duration"**     **is displayed but the facility is already linked.** (Milestone 3) 

 Solution : In the API request body, please send all the HI types. Also, ensure the linked care contexts are available in the given date range and selected HI-types. 

**48. I'm encountering an error message stating "Invalid from/to date. Date must be a**     **present/before date" when making an API call to /api/hiecm/consent/v3/request/init.**     **How can I resolve this issue?** (Milestone 3) **Solution** : This error typically occurs when attempting to use future dates and times in the API request. 

**49. What is the correct structure for the timestamps in the "dateRange" field?** (Milestone 3) **Solution** : Each timestamp should adhere to the correct UTC ISO format: “     YYYYMMDDTHH:MM:SS.SSSZ “ 

**50. how to decrypt and parse the FHIR bundle?** (Milestone 3) 

**Solution** : To decrypt the FHIR bundle, you must use the same keys that were provided to the HIP and the keys received in the dataPushUrl during the request. 

To parse the FHIR bundle, you need to map all the known attributes as per the NRCES FHIR guidelines and display them accordingly in your application. 

**51. Encrypted data is received, but for some Health Information Providers (HIPs), the**     **following error appears:**     **"HIP did not acknowledge the HIP consent notify. Please try again after some time."**     (Milestone 3) 

**Solution** : This error indicates that the concerned HIP has not acknowledged the /hip/notify callback. The issue lies on the HIP side, not on the Health Information User (HIU) side. Until the HIP acknowledges the consent notification, the ABDM system prevents further actions—such as initiating a data request—to ensure data privacy and compliance. 

 <End of Document> 



