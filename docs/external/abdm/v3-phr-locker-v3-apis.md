# PHR & Locker V3 APIs

> Source: ABDM Sandbox V3 Documentation
> File: ABHA_PHR_V3_Documents_2_7d2263ce28.docx

# <a id="_Toc176957894"></a><a id="OLE_LINK431"></a>PHR DOCUMENTATION

Version 1\.1

Created On 28\.04\.2025

[PHR DOCUMENTATION	1](#_Toc176957894)

[1\.Overview of the functionality	4](#_Toc176957895)

[1\.1\.	Registration Of ABHA Address	4](#_Toc176957896)

[1\.2\.	Login into PHR Application	4](#_Toc176957897)

[1\.3\.	ABHA profile Management	6](#_Toc176957898)

[2\.API sequence diagram	8](#_Toc176957899)

[2\.1\.    PHR\_Enrollment \- Registration via Mobile Number	8](#_2.1_PHR_Enrollment_-)

[2\.2    PHR\_Enrollment \- Registration via ABHA Number \(AADHAAR OTP\)	9](#_Toc176957901)

[2\.3    PHR\_Enrollment \- Registration via ABHA Number \(ABHA OTP\)	10](#_Toc176957902)

[2\.4    PHR\_Login – Login via Mobile Number	11](#_Toc176957903)

[2\.5    PHR\_Login – Login via Email  	12](#_Toc176957904)

[2\.6    PHR\_Login – Login using ABHA Number \(AADHAAR OTP\)\.  	13](#_Toc176957905)

[2\.7    PHR\_Login – Login using AADHAAR Number \(AADHAAR OTP\)\.  	13](#_Login_using_AADHAAR)

[2\.8    PHR\_Login – Login using ABHA Number \(ABHA OTP\)	](#_PHR_Login_–_Login)14

[2\.9    PHR\_Login – Login using AADHAAR Number\(AADHAAR Face Verify\)\.	](#_PHR_Login_–_Login_2)14

[2\.10   PHR\_Login – Login using ABHA Number \(ABHA Face Verify\)	14](#_PHR_Login_–_Login_3)

[2\.11    PHR\_Login – Login using Password …………………………………                              	15](#_PHR_Login_–_Login_4)

[2\.12   PHR\_Profile – Get Profile Details	15](#_PHR_Profile_–_Get)

[2\.13   PHR\_Profile – Mobile number Update	16](#_PHR_Profile_–_Mobile)

[2\.14   PHR\_Profile – Edit Profile Details	16](#_PHR_Profile_–_Edit)

[2\.15   PHR\_Profile – Get QR Code   	17](#_PHR_Profile_–_Get_1)

[2\.16   PHR\_Profile – Link ABHA Address to ABHA Number 	17](#_PHR_Profile_–_Link)

 

[3 PHR API Information Request Response	19](#_Toc176957913)

[ PHR APIs	19](#_PHR_APIs)

[3\.0 Generate session token	19](#_3.0_Generate_session)

[3\.1 Encrypt data \(Aadhaar/Mobile/Otp/Password	19](#_3.1_Encrypt_data)

[3\.2 PHR\_Enrollment \- Registration via Mobile Request OTP	19](#_Toc176957914)

[3\.3 PHR\_Enrollment – Registration via Mobile Verify\-OTP	21](#_Toc176957915)

[3\.4\.PHR\_Enrollment \- Registration via <a id="_Hlk177043361"></a>ABHA Number Request\-AADHAAR       OTP\)……………………………………………………………………………………………………………………………………………………\.\.24](#_Toc176957916)

[3\.5\. PHR\_Enrollment \- Registration via ABHA Number Verify\-AADHAAR           OTP\)……………………26](#_Toc176957917)                                                                                                                 

[3\.6 PHR\_Enrollment\- Registration via ABHA Number Request\-ABHA OTP	29](#_Toc176957918)

[3\.7 PHR\_Enrollment \- Registration via ABHA Number Verify\-ABHA OTP	31](#_Toc176957919)

[3\.8\. PHR\_Enrollment– ABHA Address Suggestion 	34](#_Toc176957920)

[3\.9\. PHR\_Enrollment – ABHA Address Existence	37](#_Toc176957921)

[3\.10\. PHR\_Enrollment \- Registration of ABHA Address	39](#_Toc176957922)

[3\.11 PHR\_Login – Login via Mobile Request\-OTP	44](#_Toc176957923)

[3\.12 PHR\_Login – Login via Mobile Verify\-OTP	47](#_Toc176957924)

[3\.13 PHR\_Login – Login using ABHA Number Request\-AADHAAR OTP\.	53](#_Toc176957927)

[3\.14 PHR\_Login – Login using ABHA Number Verify\-AADHAAR OTP	56](#_Toc176957928)

[3\.15 PHR\_Login – Login using AADHAAR Number Request\-AADHAAR OTP	58](#_3.17_PHR_Login_–)

[3\.16 PHR\_Login – Login using AADHAAR Number Verify\-AADHAAR OTP	60](#_3.18_PHR_Login_–)

[3\.17 PHR\_Login – Login using ABHA Number Request\-Mobile OTP	61](#_3.19_PHR_Login_–_2)

[3\.18 PHR\_Login – Login using ABHA Number Request\-Mobile OTP	62](#_3.20_PHR_Login_–_2)

[3\.19 PHR\_Login – Login using ABHA Address Request\-MOBILE OTP	63](#_3.19__PHR_Login)

[3\.20 PHR\_Login – Login using ABHA Address Verify\-MOBILE OTP	64](#_3.20_PHR_Login_–)

[3\.21 PHR\_Login – Login Using ABHA Address request\-EMAIL OTP	66](#_3.24_PHR_Login_–_1)

    [3\.22 PHR\_Login – Login Using ABHA Address Verify\-Email OTP…](#_3.25_PHR_Login_–_1)……………\.\.……68

[3\.23 PHR\_Login – Login using Password Search User	70](#_3.21_PHR_Login_–)

[3\.24 PHR\_Login – Verify using Password	72](#_3.22_PHR_Login_–)

[3\.25 PHR\_Login – Verify User	73](#_3.23_PHR_Login_–)

[3\.26 PHR\_Profile \- Update Mobile Request\-OTP……………	76](#_3.24_PHR_Profile_-)

[3\.27 PHR\_Profile – Verify Mobile Verify\-OTP	78](#_3.25_PHR_Profile_–)

[3\.28 PHR\_Profile – Update EMAIL Request\-OTP	82](#_3.26_PHR_Profile_–)

[3\.29 PHR\_Profile – Update EMAIL Verify\_OTP	84](#_3.27_PHR_Profile_–)

[3\.30 PHR\_Profile – update password	88](#_3.28_PHR_Profile_–)

[3\.31 PHR\_Profile – Link ABHA number via MOBILE\-Request OTP	91](#_3.29_PHR_Profile_–)

[3\.32 PHR\_Profile – Link ABHA number via MOBILE\-Verify otp	94](#_3.30_PHR_Profile_–)

[3\.33 PHR\_Profile – Process Link Request via ABHA	97](#_3.31_PHR_Profile_-)

[3\.34 PHR\_Profile – Link ABHA number via AADHAAR\-Request OTP	99](#_3.32_PHR_Profile_–)

[3\.35 PHR\_Profile \- Link ABHA Number via AADHAAR\-Verify OTP	101](#_3.33_PHR_Profile_-)

[3\.36 PHR\_Profile \- Process Link Request via AADHAAR Number	105](#_3.34_PHR_Profile_-)

   [ 3\.37 PHR\_Profile  Switch Profile Request	124](#_3.37_PHR_Profile_-)

[3\.38 PHR\_Profile Switch Profile Verify	125](#_3.38_PHR_Profile_-)

[3\.39 PHR\_Profile – Get User Profile	127](#_3.39_PHR_Profile_–)

[3\.40PHR\_Profile \- Get User QR Code	128](#_3.40_PHR_Profile_-)

[3\.41 PHR\_Profile \-Get User PHR Card	130](#_3.44_PHR_Profile_-Get)

[3\.42 PHR\_Profile – Update User Profile	133](#_3.45_PHR_Profile_-)

[3\.43 PHR\_Profile – Generate Refresh Token	134](#_3.48_PHR_Profile_-)

[3\.44 PHR\_Profile \-GET Certificate \(Public Key\)	135](#_3.47_PHR_Profile_-)

[3\.45 PHR\_Profile – Logout User	136](#_3.45_PHR_Profile_–)

[4  HIECM API Information Request Response	138](#_Toc176957959)

[  Gateway	140](#_Toc116697)

[4\.1  Overview	142](#_4.1_Overview)

[4\.2  List of APIs	143 ](#_3.2_List_of)

[4\.2\.1  Auth token API	144 ](#_4.2.1__Auth)

[4\.2\.2  OpenID Configuration API	145 ](#_4.2.2__OpenID)

[4\.2\.3  Keycloak Certificate API	146 ](#_4.2.3__Keycloak)

[4\.2\.4  Update bridge URL API	148 ](#_4.2.4__Update)

[4\.2\.5  Registration of Facility & Software Linkage	149 ](#_4.2.5__Registration)

[4\.2\.6  Find bridge by service id	150 ](#_4.2.6__Find)

[4\.2\.7  Find services by bridge id………………………………………………………………………………………\.150 ](#_4.2.7__Find)

### [4\.2\.8 Certificate AP](#_4.2.8__Certificate)I……………………………………………………………………………………………………………………\.151

[5 Scan and Profile Share](#_5_Scan_and)

[5\.1  Overview……………………………………………………………………………………………………………………………\.152](#_5.1_Overview)

[5\.2 Sequence Diagram  ……………………………………………………………………………………………………153 ](#_5.2_Sequence_Diagram)

[5\.3 List of APIs  ………………………………………………………………………………………………………………………\.\.154 ](#_Toc116710)

[5\.3\.1  Profile share   ………………………………………………………………………………………………………………\.156](#_5.3.1__Profile)

[5\.3\.2  Profile share Callback    ………………………………………………………………………………………\.\.157](#_5.3.2__Profile)

   [ 5\.3\.3 Profile on\-share](#_5.3.3__Profile)……………………………………………………………………………………………………………158

[    5\.3\.4 Profile on\-share Callback](#_5.3.4__Profile) …………………………………………………………………\.…………………158

__6 Consent manager flow__

[6\.1    Overview\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.159](#_6.1_Overview)

[6\.2   Sequence Diagram \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_6.2_Sequence_Diagram)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.160

[6\.3   API Information Request & Response \.\.\.\.\.\.\.\.\.\.\.\.](#_6.3_API_Information)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 161

[6\.4   HIE\-CM – Consent request init\.](#_6.4_HIE-CM_-)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.162 

[6\.5   HIE\-CM\- Consent request init \- call back\.\.\.\.\.\.\.](#_6.5_HIE-CM-_Consent)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.163

[6\.6   HIE\-CM\- Callback API to HIU when a consent request is…………………… …\.164](#_6.6_HIE-CM-_Callback)

[   APPROVED/REVOKED/DENIED…](#_6.6_HIE-CM-_Callback)………………\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.165

[6\.7 	HIE\-CM – API for HIU to respond back to consent HIU callback](#_6.7_HIE-CM_–) \.\.\.\.\.\. 166

[6\.8      HIE\-CM – API for HIP to respond back to consent HIP callback](#_6.8_HIE-CM_–_1)…\. …\.\.167

[6\.9 	HIE\-CM\- Consent request status\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_6.8_HIE-CM_–)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.    168

[6\.10 	HIE\-CM \- Consent request on\-status \(Callback\) \.\.\.\.\.](#_6.10_HIE-CM-_Consent)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 169

[6\.11	HIE\-CM \- Consent request fetch \.](#_6.11_HIE-CM_-)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. \.\.\.169 

[6\.12 	HIE\-CM \- GET ALL Link Records……\.…………………](#_6.12_HIE-CM_–)……………\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 170

[6\.13 	HIE\-CM \- Consent Auto Approve…………](#_6.13_HIE-CM_–)…………………………………\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 171

[6\.14 	HIE\-CM \- Consent Disable Auto Approve…………](#_6.14_HIE-CM_–)…\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 172

[6\.15 	HIE\-CM \- Consent Enable Auto Approve…\.\. …](#_6.15_HIE-CM_–)……\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 173

[6\.16 	HIE\-CM \- GET all Consent Request For an ABHA Address……………](#_6.16_HIE-_CM)\.\.\.\.\.\.\. 174

[6\.17 	HIE\-CM \- Get all consent Request details by consent request id…](#_6.17_HIE-_CM)\.175

[6\.18 	HIE\-CM \- Get all consent artifact details by request id …](#_6.18_HIE-_CM)…………………\.\.\.177

[6\.19 	HIE\-CM \- Get consent artifact details by aetifact id ……](#_6.19_HIE-_CM)…………\.…………\.\.\.178

[6\.20 	HIE\-CM \- Get all consent artifact details by artifact id \.…](#_6.20_HIE-_CM)…………………\.\.\.179

[6\.21   HIE\-CM \- Deny\-Consent\-Request……](#_6.21_HIE-CM-Deny_-)………………………………………………………………\.\.179

[6\.22 HIE\-CM \- Revoke\-Consent\-Request…](#_6.22_HIE-CM-Revoke_-)…………………………………………………………\. …\.180

__    __

[7 Data Flow  ……………………………………………………………………………1](#_7_Data_Flow)81  
[7\.1 Overview](#_7.1_Overview)\. …………………………………………………………………………………………………………………………………\.\.182

[7\.2   Sequence Diagram \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_7.2_Sequence_Diagram)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.182

[7\.3   API Information Request & Response \.\.\.\.\.\.\.\.\.\.\.\.](#_7.3_API_Information)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 183

[7\.3\.1 Data flow – Data request invoked by HIU…](#_7.3.1_Data_flow)………………………………………………………………………\.184

[7\.3\.2 Data flow – call back to HIU \.\.\.\.\.\.](#_7.3.2_Data_flow)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.185

[7\.3\.3 Notify HIP\.\.\.\.\.\.](#_7.3.3_Data_flow)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.186

[7\.3\.4 Notify HIU\.\.](#_7.3.4_Data_flow)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.187

[7\.3\.5 Data\-flow\-request\-status\.\.](#_7.3.5_Data_flow)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.188

__8 Subscription Flow……………………………………………………………………………………\.\.\.190__

[8\.1     Overview ………………………………………………………………………………………………………………………………\.](#_8.1_Overview)191

[8\.2    Sequence Diagram \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_8.2_Sequence_Diagram)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.192

[8\.3   API Information Request & Response \.\.\.\.\.\.\.\.\.\.\.\.](#_8.3_API_Information)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 193

[8\.3\.1 Get all__ __subscription requests__ __for an ABHA Address ](#_8.3.1_Users_get)……………………\.……\.………\.195

[8\.3\.2 User subscription request initiate …](#_8.3.2_User_subscription)……………………………………………\.………………………\.196

[8\.3\.3 User Subscription request initiate – Call Back](#_8.3.3_User_subscription) ……………………\.………………………\.197

[8\.3\.4 Approve Subscription Request](#_8.3.4_Approve_Subscription) ……………………………………………………\.……………\.…………\.198

[8\.3\.5 Approve Subscription – Call back](#_8.3.5_Approve_Subscription) …………………………………\.……………\.………………\.……\.199

[8\.3\.6 Subscription Request Hiu – on notify](#_8.3.6_Subscription_Request) …………………\.…………………………\.…………………200

[8\.3\.7 Deny Subscription Request](#_8.3.7_Deny_Subscription) …………………………………\.………………………………\.…………………\.201

[8\.3\.8 Deny Subscription – Call Back](#_8.3.8_Deny_Subscription) ……………………\.………………………………………………………\.202

[8\.3\.9 Edit Subscription](#_8.3.9_Edit_Subscription) ……………………………………………………………………………………………………………203

[8\.3\.10 Edit Subscription – call back](#_8.3.10_Edit_Subscription) …………………………………………………………………………\.\.\.…\.204

[8\.3\.11 Subscription HIU –notify …](#_8.3.11_Subscription_HIU)…………………………………………………………………………………\.……\.205

[8\.3\.12 Subscription HIU –On\-notify ……………………………………………………………………………\.…\.207](#_8.3.12_Subscription_HIU)

[8\.3\.13 Subscription Details\-by\-Request\-Id ……](#_8.3.13_Subscription-details-by-Requ)…………………………………………………\.……\.209

[8\.3\.14  Subscription Details\-by\- Subscription \-Id …](#_8.3.14_Subscription-details-by-Subs)…………………………………………\.……\.211

[8\.3\.15 Patient Request …](#_8.3.16_Patient-requests)………………………\.……………………………………………………………………\.……\.……\.212

[8\.3\.16 Patient Subscribed\-Lockers …](#_8.3.16_GET_Patient)…………………………………………………………………\.…\.\.………\.213

[8\.3\.17 Patient\-Locker\-Details\-By\-Locker\-Id …………](#_8.3.17_patient-locker-details-by-lo)……………………………………………\.……\.214

[8\.3\.18 Setup\-Locker………………………………………………………………](#_8.3.18_Setup_Locker)……………………………………………\.……\.214

[__9 HIP Initiated Linking__](#_9_HIP_Initiated)__………………………………………………………………………\.\.………\.\.\.215__

[9\.1     Overview ……………………………………………………………………………………………………………………\.………\.,\.](#_9.1_Overview)217

[9\.2    Sequence Diagram \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_9.2_Sequence_Diagram)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.218

[9\.3   API Information Request & Response \.\.\.\.\.\.\.\.\.\.\.\.](#_9.3_List_of)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 219

[9\.3\.1 Link Token Generation………………………………\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_9.3.1_Link_token)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.220

[9\.3\.2 Link Token Generation\-Call Back\.\.……\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_9.3.2_Link_token)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.221

[9\.3\.3 Linking Care Context…\.\.……………………………\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_9.3.3_Linking_care)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.222

[9\.3\.4 Linking Care Context Call Back API with Patient ABHA         Address\.\.\.\.](#_9.3.4_Linking_care)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.223

[9\.3\.5 GET All Link……\.………………………………\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_9.3.5_GET_All)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.224

[9\.3\.6 Notify care Context Update……………\.\.…\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_9.3.6_Notify_care)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.225

[9\.3\.7 Notify care Context Update Call back…\.\.\.\.\.\.\.](#_9.3.7_Call_back)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.225

[9\.3\.8 SMS Notification to Patients…………\.\.……\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_9.3.8_SMS_Notification)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.226

[9\.3\.9 SMS Notification to Patient Call Back API\.\.\.\.\.\.\.\.\.\.\.](#_9.3.9_Callback_API)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.227

[__10 User Initiated Linking__](#_9_HIP_Initiated)__………………………………………………………………………………\.\.\.215__

[10\.1     Overview …………………………………………………………………………………………………………………\.………\.\.\.](#_10.1_Overview)217

[10\.2    Sequence Diagram \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_10.2_Sequence_Diagram)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.218

[10\.3    API Information Request & Response \.\.\.\.\.\.\.\.\.\.\.\.](#_10.3_List_of)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.219

[10\.3\.1  Patient Health Record Discovery \.\.\.\.\.\.\.\.\.\.\.\.](#_10.3.1_Patient_Health)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.220

[10\.3\.2 HIE\-CM Callback To HIP\-Discovey \.\.\.\.\.\.\.\.\.\.\.\.](#_10.3.2_HIE-CM_callback)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 221

[10\.3\.3 HMIS/LMIS response on Health Record Discover\.\.\.\.\.\.\.\.\.\.\.\.](#_10.3.3_HMIS/LMIS_response)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 222

[10\.3\.4 HIE\-CM Callback on Health Record Discover\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.](#_10.3.4__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 223

[10\.3\.5 Patient Health Record Link Init \.\.\.\.\.\.\.\.\.\.\.\.](#_10.3.5__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 224

[10\.3\.6 HIE\-CM Callback 0n Health Record Link Init\.\.\.\.\.\.\.\.\.\.\.\.](#_10.3.6__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.225

[10\.3\.7 HMIS/LMIS response on Health Record Link\.\.\.\.\.\.\.\.\.\.\.\.](#_10.3.7__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.226

[10\.3\.8 HIE\-CM Response on Health Record Link\.\.\.\.\.](#_10.3.8__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 227

[10\.3\.9 Patient health record confirm\.\.\.\.\.](#_10.3.9__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.228

[10\.3\.10 HIE\-CM Callback for Health Recod Confirmation\.\.\.](#_10.3.10__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 229

[10\.3\.11 HMIS/LMIS response on Health Record Confirm\.\.\.\.\.](#_10.3.11__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. 230

[10\.3\.12 HIE\-CM Response on Health Record Confirm\.\.\.\.](#_10.3.12__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.231

[10\.3\.13 HIE\-CM all\-providers\.\.\.\.](#_10.3.13__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.232

[10\.3\.14 HIE\-CM provider\-by\-provider\-id ………………………\.\.\.](#_10.3.12__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.233

[10\.3\.15 HIE\-CM Govt Programs………………………………………………\.\.\.\.](#_10.3.15__)\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.234

[11 API listing  …………………………………………………………………………\.235](#_11._API_listing)

[12 Error<a id="_Hlt196403208"></a> codes listing………………………………………………………………\.\.236](#_12._Error_codes)

__                                                                                                                                                    __

  
  
  
  
  
  
  
  


#  <a id="_Toc176957895"></a>Overview of the functionality

## <a id="_Toc176957896"></a><a id="_Hlk176452754"></a>__Registration Of ABHA Address__

<a id="_Toc132891544"></a><a id="OLE_LINK101"></a><a id="OLE_LINK102"></a>Users can register on the ABHA App through two methods: using their mobile number or ABHA number\. OTP verification is employed for validation\. Users can view their existing ABHA Address via the chosen registration method\. Additionally, the system ensures the uniqueness of each ABHA Address\.  
  
__a\. Registration via Mobile Number__

The registration using Mobile number is done by triggering OTP to the entered mobile number\. Once the OTP is verified successfully, the user is allowed to create the ABHA Address\. 

__b\. Registration via ABHA Number \(AADHAAR OTP\)__

The registration using AADHAAR OTP is done by calling an ABHA service using the ABHA Number\. OTP will be triggered to the mobile number linked with the AADHAAR number\. Once the OTP is verified successfully, the user is allowed to create the ABHA Address\. 

__c\. Registration via ABHA Number \(MOBILE OTP\)__

	The registration using ABHA OTP is done by calling an ABHA service using the ABHA Number\. OTP will be triggered to the mobile number linked with the given ABHA number\. Once the OTP is verified successfully, the user is allowed to create the ABHA Address\.

## <a id="_Toc176957897"></a><a id="_Hlk176452780"></a>__Login into PHR__

Users can login into ABHA App using following ways: 

1. __Login into PHR using Mobile Number __

Login using mobile numbers is achieved by triggering OTP to the entered mobile number\. <a id="OLE_LINK1"></a><a id="OLE_LINK2"></a>Once the OTP is verified successfully, the user is allowed to login by selecting ABHA Address from the list\.

1. __Login into PHR using Email Id \(Optional\)__

Login using Email Id is achieved by triggering OTP to the entered email Id\. Once the OTP is verified successfully, the user is allowed to login by selecting ABHA Address from the list\.

1. __Login into PHR using __<a id="_Hlk177044044"></a>__ABHA Number \(AADHAAR OTP\)__

Login using AADHAAR OTP is achieved by consuming the ABHA service that internally consumes the AADHAAR service that triggers OTP to the linked mobile number to AADHAAR Number\. Once the OTP is verified successfully, the user is allowed to login by selecting ABHA Address from the list\.

1. __Login into PHR using ABHA Number \(MOBILE OTP\)__

Login using ABHA OTP is achieved by consuming the ABHA service that triggers OTP to the linked mobile number\. Once the OTP is verified successfully, the user is allowed to login by selecting ABHA Address from the list\.

1. __Login into PHR using ABHA Address Password__

Login using Password is a traditional way of logging in by entering the password created during the enrollment process\. Once the Password is verified successfully, the user is allowed to create the ABHA Address\.  


1. __Login into PHR using ABHA Address Mobile OTP__

Login using Mobile OTP is a traditional way of logging in by entering the ABHA Address it will send an OTP to link mobile number\. Once the OTP is verified successfully, the user is allowed to login\.

1. __Login into PHR using ABHA Address Email OTP\(Optional\)__

Login using Email OTP is a traditional way of logging in by entering the ABHA Address it will send an OTP to link email id\. Once the OTP is verified successfully, the user is allowed to login\.

1. __Login into PHR using AADHAAR Number via AADHAAR OTP__

Login using AADHAAR OTP is achieved by consuming the AADHAAR service that triggers an OTP to the mobile number linked to the AADHAAR Number\. Once the OTP is successfully verified, the user is allowed to log in by selecting their ABHA Address from the list\.

 

## <a id="_Toc176957898"></a>__ABHA profile Management__

1. __Update mobile number__

__	__<a id="_Hlk177044935"></a>This API allows users to update their mobile number\. An OTP is sent to the new mobile number for verification, and once verified, the new number is updated in the system\.  


1. __Update email__

__	__This API allows users to update their email id\. An OTP is sent to the new email id for verification, and once verified, the new email id is updated in the system\.

1. __Update password__

This API is used to update the password of the user account after login\. By verifying if the new password is not the same as the old password, user can update the password\.

1. __Get profile details__

The get profile details API simply get the users profile details which includes his Name, DOB, ABHA Number, Mobile number, Email Id profile photo etc\., along with the address details\. Details are fetched from phr\_users and phr\_address tables\.

1. __Edit Profile Details__

__       __This feature allows the user to update the user details except the ABHA address\.

1. __Get QR Code__

__	__This API is used to get the user details in the form of QR code\. This is useful when the hospital wants the user details in the form of QR code to scan\.

1. __Get PHR Card__

__	__This API is used to get the user details in the form of Card\.

1. __Get Refresh Token__

This API is used to get the new login token with the help of Refresh token\.

1. __Logout__

This API is used to logout the user from the application\.

1. __Link ABHA Address to ABHA Number__

This API is used to link ABHA Address to ABHA Number\.

1. __Switch Profile__

This API is used to switch the user accounts\.

1. __GET PHR Certificate__

This API will return the certificate \(public\-key\) along with the encryption algorithm\.

  
  
  
  
  
  
  
  
  
  
  
  
  
  


# <a id="_Toc126205795"></a><a id="_Toc126774601"></a><a id="_Toc176957899"></a>API sequence diagram

## <a id="_2.1_PHR_Enrollment_-"></a><a id="_Toc176796163"></a><a id="_Toc176957900"></a>2\.1 PHR\_Enrollment \- Registration via Mobile Number

[image removed - see original document]

## <a id="_Toc176957901"></a><a id="_Hlk177043254"></a>PHR\_Enrollment \- Registration via ABHA Number AADHAAR\-OTP

[image removed - see original document]

## <a id="_Toc176957902"></a>PHR\_Enrollment \- Registration via ABHA Number \(ABHA OTP\)

[image removed - see original document]

 

## <a id="_Toc176796166"></a><a id="_Toc176957903"></a>2\.4 PHR\_Login – <a id="_Hlk177043497"></a>Login via Mobile Number  
  


[image removed - see original document]

## <a id="_Hlk176955401"></a><a id="_Toc176957904"></a><a id="_Toc126195839"></a><a id="_Toc126205796"></a><a id="_Toc126774603"></a>2\.5 PHR\_Login – Login via Email  
  
[image removed - see original document]

## <a id="_Toc176957905"></a>PHR\_Login – Login using ABHA Number \(AADHAAR OTP\)\.  
  
[image removed - see original document]

## <a id="_Login_using_AADHAAR"></a><a id="_Toc176957906"></a>Login using AADHAAR Number \(AADHAAR OTP\)

       [image removed - see original document]

## <a id="_PHR_Login_–_Login"></a>PHR\_Login – Login using ABHA Number \(ABHA OTP\)

[image removed - see original document]

<a id="_PHR_Login_–_Login_1"></a>

## <a id="_PHR_Login_–_Login_2"></a>PHR\_Login – Login using AADHAAR Number\(AADHAAR Face Verify\)

[image removed - see original document]

## <a id="_PHR_Login_–_Login_3"></a>PHR\_Login – Login using ABHA Number \(ABHA Face Verify\)

[image removed - see original document]

## <a id="_PHR_Login_–_Login_4"></a><a id="_Toc176957907"></a>PHR\_Login – Login using Password      
                           
[image removed - see original document]

  


## <a id="_PHR_Profile_–_Get"></a><a id="_Toc176957908"></a>PHR\_Profile – Get Profile Details

[image removed - see original document]

## <a id="_PHR_Profile_–_Mobile"></a> PHR\_Profile – Mobile number Update

      [image removed - see original document]

## <a id="_PHR_Profile_–_Edit"></a><a id="_Toc176957909"></a>PHR\_Profile – Edit Profile Details

[image removed - see original document]

## <a id="_PHR_Profile_–_Get_1"></a><a id="_Toc176957910"></a>PHR\_Profile – Get QR Code  
  
  
[image removed - see original document]

## <a id="_PHR_Profile_–_Link"></a><a id="_Toc176957911"></a>PHR\_Profile – Link ABHA Address to ABHA Number

[image removed - see original document]<a id="_PHR_Profile_–_De-link"></a>  
  
  
  
  
  
  
  
  
  
  


# <a id="_PHR_APIs"></a><a id="_Toc182241761"></a><a id="_Toc176957913"></a>PHR APIs 

__Environment URLs __\{\{base\_url\}\}__:__

__ SBX: __https://abhasbx\.abdm\.gov\.in/abha/api/v3/phr/app/ 

__ PROD:  __[https://apis\.abdm\.gov\.in/phr/api/phr/app/v3/](https://apis.abdm.gov.in/phr/api/phr/app/v3/)__ __

__Note__: Base URLs for ABHA Address verification: 

__SBX__:  [https://abhasbx\.abdm\.gov\.in/abha/api/v3/phr/web](https://abhasbx.abdm.gov.in/abha/api/v3/phr/web/) 

__PROD__: [https://phr\.abdm\.gov\.in/api/phr/web/v3](https://phr.abdm.gov.in/api/phr/web/v3/)

# 3\. API Information Request Response 

## <a id="_3.0_Generate_session"></a>3\.0 __Generate Session Token__

# <a id="OLE_LINK4"></a>This API generates a session token using client\_id, client\_secret, and grantType\. By passing all the required attributes, it will generate a session token to access the API\. The session token remains valid for 20 minutes\.

__3 Session:__ 

[__https://dev\.abdm\.gov\.in/api/hiecm/gateway/v3/sessions__](https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions)

__Method:__ POST

__V3 Request Headers:__

Property Name

Example Value

Required

Description

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

Unique UUID for tracking the end\-to\-end request transaction

TIMESTAMP

\{\{$isoTimestamp\}\}

Yes

The actual time when the request was initiated, ISO Date time format represents the date and time

X\-CM\-ID

\{\{X\_CM\_ID\)\)

Yes

This value depends on the environment where API is getting executed\. Eg\. SBX or PROD\.

For SBX\- sbx and for PROD\- abdm

__Body Parameters:__

Property Name

Example Value

Required

Description

clientId

"\{\{ClientId\}\}"

Yes 

This is a unique identifier assigned to a client application by the authorization server\. It is used to identify the client making the request\.

clientSecret

"\{\{ClientSecret\}\}"

Yes 

This is a secret known only to the client and the authorization server\. It is used to authenticate the client to the server and should be kept confidential\.

grantType

"client\_credentials"

Yes

This specifies the method used by the client to obtain an access token\. In your example, "client\_credentials" is a grant type where the client application uses its own credentials to authenticate and obtain an access token, typically used for server\-to\-server interactions\.

__Request Body:  
__

Request Body

\{

    "clientId": "\{\{ClientId\}\}",

    "clientSecret": "\{\{ClientSecret\}\}",

    "grantType": "client\_credentials"

\}

# Response Body:

Code: 200 OK 

\{ 

    "accessToken": 

"eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJBbFJiNVdDbThUbTlFSl9JZk85ejA2a jlvQ3Y1MXBLS0ZrbkdiX1RCdkswIn0\.\.hmJ4tmAbpRd8tPMmzZTdQvzGhxE7rQcDJEow2MrL3W1MhSeZk\_ CEjGYyHh7NDgFzzfT39oQiUAYf06buXi1KWX8xptkrQk1uitgNecqw8Lel5wufs2Z8dFawsYJtmVHPP\_2r

DqvUhSeTADGYBp\-84tXkpslgp2tjkjsdOOkQsZtpJLaV\_vHkkLi7QRncl2KG2IfHDS8yebcpqi\-

MMGYcDmyb42Po5xmQ9Lzw6IwgJzUJsFxKbIQ22m3MaYqXYt4ZOPfxYcunr7ppMhNldJVE55\_CMuY\-

NfWrbaTkc6iLA\-y0PCQ\-yvyu9l1pN2iwyJbtMotEtV065Uqek0oQ0py2Mw",

    "expiresIn": 1200, 

    "refreshExpiresIn": 1800,

    "refreshToken": 

"eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIyMWU5NzA4OS00ZTcxLTQyNGEtOTAzY

S1jOTAyMWM1NmFlNWYifQ\.eyJleHAiOjE3MTA0MDM1NjIsImlhdCI6MTcxMDQwMTc2MiwianRpIjoiZTQ0

NDgzYzctZDFmYy00ZDg5LTkyNzctOTUxY2I0MDNhYzUwIiwiaXNzIjoiaHR0cHM6Ly9kZXYubmRobS5nb3 YuaW4vYXV0aC9yZWFsbXMvY2VudHJhbC1yZWdpc3RyeSIsImF1ZCI6Imh0dHBzOi8vZGV2Lm5kaG0uZ292 LmluL2F1dGgvcmVhbG1zL2NlbnRyYWwtcmVnaXN0cnkiLCJzdWIiOiIwNmJkNGZlNy04NjEyLTRiZmEtYT I1NS1iMDdiZmFjZmU1M2QiLCJ0eXAiOiJSZWZyZXNoIiwiYXpwIjoiaGVhbHRoaWQtYXBpIiwic2Vzc2lv bl9zdGF0ZSI6IjBiNDljZDBjLWQ0OWQtNDA0Yi1hZWY3LWRlZGY3NDRlNTA1ZCIsInNjb3BlIjoib3Blbm lkIGVtYWlsIHByb2ZpbGUifQ\.NAM\-WFGbIqmGHaWa\_\_9WnJPvgIyZdCAE9AwxYUz5UrM", 

    "tokenType": "bearer" 

\} 

## <a id="_3.1_Encrypt_data"></a>3\.1 Encrypt data \(Aadhaar/Mobile/OTP/Password\)  


__Step 1 :__ To encrypt any data\(Aadhaar/Mobile/OTP/Password etc\) public key can be generated using below API\.  

__URL: __https://abhasbx\.abdm\.gov\.in/abha/api/v3/phr/app/login/public/certificate

__Request:__ GET 

# [image removed - see original document]

\{

    "publicKey": "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAstWB95C5pHLXiYW59qyO4Xb\+59KYVm9Hywbo77qETZVAyc6VIsxU\+UWhd/k/YtjZibCznB\+HaXWX9TVTFs9Nwgv7LRGq5uLczpZQDrU7dnGkl/urRA8p0Jv/f8T0MZdFWQgks91uFffeBmJOb58u68ZRxSYGMPe4hb9XXKDVsgoSJaRNYviH7RgAI2QhTCwLEiMqIaUX3p1SAc178ZlN8qHXSSGXvhDR1GKM\+y2DIyJqlzfik7lD14mDY/I4lcbftib8cv7llkybtjX1AayfZp4XpmIXKWv8nRM488/jOAF81Bi13paKgpjQUUuwq9tb5Qd/DChytYgBTBTJFe7irDFCmTIcqPr8\+IMB7tXA3YXPp3z605Z6cGoYxezUm2Nz2o6oUmarDUntDhq/PnkNergmSeSvS8gD9DHBuJkJWZweG3xOPXiKQAUBr92mdFhJGm6fitO5jsBxgpmulxpG0oKDy9lAOLWSqK92JMcbMNHn4wRikdI9HSiXrrI7fLhJYTbyU3I4v5ESdEsayHXuiwO/1C8y56egzKSw44GAtEpbAkTNEEfK5H5R0QnVBIXOvfeF4tzGvmkfOO6nNXU3o/WAdOyV3xSQ9dqLY5MEL4sJCGY1iJBIAQ452s8v0ynJG5Yq\+8hNhsCVnklCzAlsIzQpnSVDUVEzv17grVAw078CAwEAKI==",

    "encryptionAlgorithm": "RSA/ECB/OAEPWithSHA\-1AndMGF1Padding"

\}

__Step 2 :__ once public key is generated data can be encrypted using below third party API “[https://www\.devglan\.com/online\-tools/rsa\-encrypt”](https://www.devglan.com/online-tools/rsa-encrypt) 

Step 3: Select Cipher type as __RSA/ECB/OAEPWithSHA\-1AndMGF1Padding__

## <a id="_Toc176957914"></a><a id="_Hlk138917863"></a>3\.2 <a id="_Hlk176452859"></a>PHR\_Enrollment \- Registration via Mobile Request\-OTP

This API endpoint will be used for registration using a mobile number\. It works by triggering an OTP to the entered mobile number\. The login hint is the mobile number\. The OTP will be generated for the given scope, login hint, login ID, and the OTP system\.

__URL:__ /abha/api/v3/phr/app/enrollment/request/otp

__Method:__ POST

__Request Headers:__

<a id="OLE_LINK180"></a>Property Name

Example Value

Required

Description

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

Unique UUID for tracking the end\-to\-end request transaction

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

The actual time when the request was initiated, ISO Date time format represents the date and time

Authorization

\{\{access\-token\}\}

Yes

JWT Access token which was issued by ABDM session API after successful validation of client id and secret

__  
Body Parameters:__

<a id="OLE_LINK181"></a>Property Name

Example Value

Required

Description

scope

"abha\-address\-enroll", "mobile\-verify"

Yes 

OTP will generate using notification service for the given scope

<a id="_Hlk125995772"></a>loginHint

"mobile\-number"

Yes 

The registration methods can be provided 

loginId

encrypted Mobile number

Yes

Encrypted login id which can be mobile number

otpSystem

"abdm"

Yes

To verify method of OTP system

__Request Body:  
__

<a id="OLE_LINK122"></a><a id="OLE_LINK123"></a>Request Body

\{

    "scope": \[

        "abha\-address\-enroll",

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "\{\{encrypted\-mobile\-number\}\}",

    "otpSystem": "abdm"

\}

__Response Body:  
__

<a id="OLE_LINK124"></a><a id="OLE_LINK125"></a>Response:

Code : 200 OK  
  
\{

    "txnId": "1bda5\*\*\*\-\*\*\*\*\-\*\*\*\*\-\*\*\*\*\-\*\*\*fca52a82",

    "message": "OTP is sent to Mobile number ending with \*\*\*\*\*\*2425"

\}

__Error scenarios:__

__Scenario__

__Request Headers/Body__

__Message__

When passing invalid mobile number

\{

    "scope": \[

        "abha\-address\-enroll",

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encrypted invalid Mobile number\}\}*",

    "otpSystem": "abdm"

\}

 \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Mobile Number"

    \}

Code: 400 Bad Request 

When passing invalid Scope 

\{

    "scope": \[

        "abha\-address\-enroll",

        "password\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encrypted Mobile number\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code: 400 Bad Request 

 

When passing invalid LoginId

\{

    "scope": \[

        "abha\-address\-enroll",

        "password\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "",

    "otpSystem": "abdm"

\}

 \{

        "code": "ABDM\-9999: ",

        "message": "Invalid LoginId"

    \}

Code : \- 400 Bad Request

## <a id="_Toc176957915"></a>3\.3 PHR\_Enrollment – Registration via Mobile Verify\-OTP

This API endpoint will be used for OTP verification against the transaction ID\. It will return an "OTP Verified Successfully" message along with the ABHA address linked to the provided mobile number for registration\.

__URL:__ /abha/api/v3/phr/app/enrollment/verify

__Method:__ POST

__Request Headers:__

<a id="OLE_LINK134"></a><a id="OLE_LINK135"></a>Property Name

Example Value

Required

Description

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for tracking the end\-to\-end request transaction\.__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__The actual time when the request was initiated, ISO Date time format represents the date and time__

Authorization

\{\{access\-token\}\}

Yes

JWT Access token which was issued by ABDM session API after successful validation of client id and secret

__Body parameters:__

<a id="OLE_LINK138"></a><a id="OLE_LINK139"></a>Property Name

Example Value

Required

Description

scope

"abha\-address\-enroll",

"mobile\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

\{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "1cba575d\-02cd\-40be\-90e6\-1e2edca88a88",

            "otpValue": "\{\{encrypted OTP\}\}"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

<a id="OLE_LINK130"></a><a id="OLE_LINK131"></a>Request Body

\{

    "scope": \[

        "abha\-address\-enroll",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

__Response Body__

__		__

Response:

<a id="OLE_LINK132"></a><a id="OLE_LINK133"></a>Code : 200 OK  
  
\{

    "txnId": "1cba575d\-02cd\-40be\-90e6\-1e2edca88a88",

    "message": "OTP Verified Successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "johndoe@sbx",

            "fullName": "John Doe",

            "abhaNumber": "XX\-XXXX\-XXXX\-1234",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \}

    \],

    "tokens": \{

        "token": "\{\{JWT\-X\-Token\}\}",

        "expiresIn": 1800,

        "refreshToken": "\{\{JWT\-R\-Token\}\}",

        "refreshExpiresIn": 1296000

    \}

\}

__Error Scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Invalid Transaction Id

\{

    "scope": \[

        "abha\-address\-enroll",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{Invalid transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

 \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

   \}

Code: 400 Bad Request

When passing Invalid OTP

\{

    "scope": \[

        "abha\-address\-enroll",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\{

        "code": "ABDM\-1006: ",

        "message": "Invalid OTP Request"

    \}

Code: 400Bad Request

When passing Invalid Scope 

\{

    "scope": \[

        "abha\-address\-enroll",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encryptedData\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid OTP Request"

    \}

\]

Code: 400Bad Request

## <a id="_Toc176957916"></a>3\.4\. <a id="_Hlk176453028"></a>PHR\_Enrollment \- Registration via ABHA Number Request\-AADHAAR OTP

This API is used if the login hint is ABHA Number, internally it will call ABHA profile service to send AADHAAR OTP for the given scope, loginHint, loginId and the otpSystem\.

__URL: __/abha/api/v3/phr/app/enrollment/request/otp

__Request: __POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2023\-03\-09T07:07:41\.793Z

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters:  
__

Property Name

Example Value

Required

Description

scope

"abha\-login",

        "aadhaar\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"abha\-number"

Yes 

The registration methods can be provided 

loginId

"*\{\{encrypted abha\-number\}\}*"

Yes

Encrypted login id which can be mobile number

otpSystem

"aadhaar"

Yes

To verify method of otp system

Request Body:

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

__  
Response Body__

__		__

Response

Code : 200 OK  


\{

    "txnId": "f90f7434\-\*\*\*\*\-40e6\-\*\*\*\*\-0c\*\*\*\*2b9b77",

    "message": "OTP sent to Aadhaar registered mobile number ending with \*\*\*\*\*\*2425"

\}

__Error scenarios:__

__Scenario__

__Request Headers/Body__

__Message__

When passing Invalid ABHA Number

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

  \{

        "code": "ABDM\-1006: ",

        "message": "Invalid ABHA Number"

    \}

Code: 400 Bad Request 

When passing Invalid Otp System

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "\{\{Invalid encrypted OTP\}\}",

    "otpSystem": "abdm"

\}

\{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

Code: 400 Bad Request 

 

When passing Invalid Login Hint

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encryptedData\}\}*",

    "otpSystem": "aadhaar"

\}

 \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Login Hint"

    \}

Code : \- 400 Bad Request

## <a id="_Toc176957917"></a>3\.5\. PHR\_Enrollment \- Registration via ABHA Number Verify\-AADHAAR OTP

After receiving the OTP, it will be validated and verified internally by calling the service to verify the Aadhaar OTP for the given scope and authData against the transaction ID using this API

__URL: __/abha/api/v3/phr/app/enrollment/verify

__Request: __POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2023\-03\-09T07:07:41\.793Z

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body parameters:__

Property Name

Example Value

Required

Description

scope

"abha\-login",

"aadhaar\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

\{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "1cba575d\-02cd\-40be\-90e6\-1e2edca88a88",

            "otpValue": "\{\{encrypted OTP\}\}"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId \}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

__Response Body:__ 

Response:

Code : 200 OK  
  
\{

    "txnId": "44297943\-\*\*\*\*\-\*\*\*\*\-95a5\-6fe10eea5558",

    "message": "OTP Verified Successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "johndoe3@abdm",

            "fullName": "John Doe",

            "abhaNumber": "\*\*\-\*\*\*\*\-\*\*\*\*\-1234",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \}

    \],

    "accounts": \[

        \{

            "mobile": "\*\*\*\*\*\*2425",

            "firstName": "John",

            "middleName": "",

            "lastName": "Doe",

            "name": "John Doe",

            "yearOfBirth": "1998",

            "dayOfBirth": "14",

            "monthOfBirth": "11",

            "gender": "M",

            "email": __null__,

            "profilePhoto": "\{\{base\-64\-encoded\-profile\-photo\}\}",

            "status": "ACTIVE",

            "stateCode": "27",

            "districtCode": "487",

            "subDistrictCode": __null__,

            "villageCode": __null__,

            "townCode": __null__,

            "wardCode": __null__,

            "pincode": "422003",

            "address": "house no\-620, main road, Pune, Maharashtra",

            "kycPhoto": "\{\{base\-64\-encoded\-kyc\-photo\}\}",

            "stateName": "MAHARASHTRA",

            "districtName": "PUNE",

            "subdistrictName": "PUNE",

            "villageName": __null__,

            "townName": "Pune",

            "wardName": __null__,

            "authMethods": \[

                "DEMOGRAPHICS",

                "MOBILE\_OTP",

                "AADHAAR\_OTP",

                "AADHAAR\_BIO"

            \],

            "tags": \{\},

            "kycVerified": __true__,

            "verificationStatus": "VERIFIED",

            "verificationType": "AADHAAR",

            "emailVerified": __null__,

            "ABHANumber": "91\-5326\-6278\-1550",

            "preferredAbhaAddress": "15\_hemant\.bodhai@sbx"

        \}

    \],

    "tokens": \{

         "token": "\{\{JWT\-X\-Token\}\}",

         "expiresIn": 1800,

         "refreshToken": "\{\{JWT\-R\-Token\}\}",

         "refreshExpiresIn": 1296000

    \}

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

To verify when Invalid Transaction Id is passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{Invalid transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

Code : 400 Bad Request

To verify when Invalid OTP Request is passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId \}\}*",

            "otpValue": "*\{\{Invalid encrypted OTP\}\}*"

        \}

    \}

\}

 \{

        "code": "ABDM\-1006: ",

        "message": "Invalid OTP Request"

    \}

 

 Code: 400Bad Request 

When invalid Invalid Auth Methods is passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId \}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

 \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \}

 

Code \- 400 Bad Request

When Invalid Scope is passed

\{

    "scope": \[

        "abha\-login",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId \}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid OTP Request"

    \}

\]

Code: 400 Bad Request

## <a id="_Toc176957918"></a>3\.6 <a id="_Hlk176954817"></a>PHR\_Enrollment \- Registration via ABHA Number Request\-MOBILE OTP

If the login hint is ABHA Number, internally to call ABHA profile service to send ABHA Linked Mobile OTP for the given scope, login Hint, loginId and the otpSystem\.

__URL: __/abha/api/v3/phr/app/enrollment/request/otp

__Request: __POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2023\-03\-09T07:07:41\.793Z

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters:  
__

Property Name

Example Value

Required

Description

scope

        "abha\-login",

        "mobile\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"abha\-number"

Yes 

The registration methods can be provided 

loginId

"*\{\{encrypted abha\-number\}\}*"

Yes

Encrypted login id which can be mobile number

otpSystem

"abdm"

Yes

To verify method of otp system

Request Body:

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

     "loginId": "*\{\{encrypted abha number\}\}*",

    "otpSystem": "abdm"

\}

__  
Response Body:__ 

Response

Code : 200 Ok   
  
\{

    "txnId": "4794327e\-\*\*\*\*\-\*\*\*\*\-91ec\-be022fbf60f7",

    "message": "OTP sent to mobile number ending with \*\*\*\*\*\*2425"

\}

__Error scenarios:__

__Scenario__

__Request Headers/Body__

__Message__

When passing Invalid ABHA Number

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid ABHA number\}\}*",

    "otpSystem": "abdm"

\}

  \{

        "code": "ABDM\-1006: ",

        "message": "Invalid ABHA Number"

    \}

Code: 400 Bad Request 

When passing Invalid LoginId

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": “\{\{*encrypted abha number* \}\}”

    "otpSystem": "abdm"

\}

\{

    "code": "ABDM\-9999",

    "message": "Invalid LoginId"

\}

Code: 400 Bad Request 

 

When Invalid Otp System is paased

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha number\}\}*",

    "otpSystem": "aadhaar"

\}

  \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

Code : \- 400 Bad Request

When Invalid Login Hint is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "password",

    "loginId": "*\{\{encrypted abha number\}\}*",

    "otpSystem": "abdm"

\}

 \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Login Hint"

    \}

Code : \- 400 Bad Request

## <a id="_Toc176957919"></a>3\.7 <a id="_Hlk176453131"></a>PHR\_Enrollment \- Registration via ABHA Number Verify\-MOBILE OTP

After receiving the OTP, it will be validated and verified internally by calling the service to verify the ABHA OTP for the given scope and authData against the transaction ID using this API\.

__URL: __/abha/api/v3/phr/app/enrollment/verify

__Request: __POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

__  
Body parameters:__

Property Name

Example Value

Required

Description

scope

        "abha\-login",

        "mobile\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

\{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

__Response Body:__ 

Response:

Code : 200 ok   
  
\{

    "txnId": "32297983\-1c66\-4b3b\-95a5\-3fe10ddd5658",

    "message": "OTP Verified Successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "14\_hemant\.bodhai@sbx",

            "fullName": "Hemant Prakash Bodhai",

            "abhaNumber": "91\-5326\-6278\-1550",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \},

        \{

            "abhaAddress": "15\_hemant\.bodhai@sbx",

            "fullName": "Hemant Prakash Bodhai",

            "abhaNumber": "91\-5326\-6278\-1550",

            "status": "ACTIVE",

            "kycStatus": "PENDING"

        \}

    \],

    "accounts": \[

        \{

            "mobile": "9922332425",

            "firstName": "Hemant",

            "middleName": "P",

            "lastName": "Bodhai",

            "name": "Hemant P Bodhai",

            "yearOfBirth": "1997",

            "dayOfBirth": "11",

            "monthOfBirth": "11",

            "gender": "M",

            "email": __null__,

            "profilePhoto": "\{\{base\-64\-encoded\-profile\-photo\}\}",

            "status": "ACTIVE",

            "stateCode": "27",

            "districtCode": "487",

            "subDistrictCode": __null__,

            "villageCode": __null__,

            "townCode": __null__,

            "wardCode": __null__,

            "pincode": "422003",

            "address": "house no\-620, main road, Pune, Maharashtra",

            "kycPhoto": "\{\{base\-64\-encoded\-kyc\-photo\}\}",

            "stateName": "MAHARASHTRA",

            "districtName": "PUNE",

            "subdistrictName": "PUNE",

            "villageName": __null__,

            "townName": "Pune",

            "wardName": __null__,

            "authMethods": \[

                "DEMOGRAPHICS",

                "MOBILE\_OTP",

                "AADHAAR\_OTP",

                "AADHAAR\_BIO"

            \],

            "tags": \{\},

            "kycVerified": __true__,

            "verificationStatus": "VERIFIED",

            "verificationType": "AADHAAR",

            "emailVerified": __null__,

            "ABHANumber": "91\-5326\-6278\-1550",

            "preferredAbhaAddress": "15\_hemant\.bodhai@sbx"

        \}

    \],

       "tokens": \{

         "token": "\{\{JWT\-X\-Token\}\}",

         "expiresIn": 1800,

         "refreshToken": "\{\{JWT\-R\-Token\}\}",

         "refreshExpiresIn": 1296000

    \}

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

To verify when Invalid Transaction Id is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "1*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

Code : 400 Bad Request

To verify when Invalid OTP Request is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "12*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

   \{

        "code": "ABDM\-1006: ",

        "message": "Invalid OTP Request"

    \}

 

 Code: 400Bad Request 

When invalid Invalid Auth Methods is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

 \[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid OTP Request"

    \}

\]

Code \- 400 Bad Request

When Invalid Scope is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid OTP Request"

    \}

\]

Code: 400 Bad Request

## <a id="_Toc176957920"></a>3\.8\. <a id="_Hlk176453155"></a>PHR\_Enrollment – ABHA Address Suggestion<a id="OLE_LINK190"></a><a id="OLE_LINK191"></a><a id="OLE_LINK184"></a><a id="OLE_LINK185"></a><a id="OLE_LINK192"></a><a id="OLE_LINK193"></a>

Before triggering the enroll API, the user can call the suggestion API to get a list of suggested ABHA Addresses based on the details provided\. To get the suggestions, all mandatory fields must be included in the request body\.

__URL:__ /abha/api/v3/phr/app/enrollment/suggestion

__Request:__ POST

__Header Parameters:__ 

Property Name

Example Value

Required

Description

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

Unique UUID for tracking the end\-to\-end request transaction\.

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

The actual time when the request was initiated, ISO Date time format represents date and time\.

Authorization

\{\{access\-token\}\}

Yes

JWT Access token which was issued by ABDM session API after successful validation of client id and secret\.

__Body Parameters:__ 

<a id="OLE_LINK148"></a><a id="OLE_LINK149"></a>Property Name

Example Value

Required

Description

txnId

"4765527e\-898b\-4a62\-91ec\-be041fbf60f8"

Yes

firstName

"John"

Yes

lastName

"Doe"

Yes

dayOfBirth

"14"

Yes

monthOfBirth

"11"

Yes

yearOfBirth

"1998"

Yes

 "email"

" " or abc@gmail\.com

Yes

__Request Body:__  

<a id="OLE_LINK187"></a><a id="OLE_LINK490"></a>Request Body

\{

    "txnId": "*\{\{transactionId\}\}*",

    "firstName": "John",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998"

    

\}

__Response Body:__ 

<a id="OLE_LINK188"></a>Response

Code : 200 OK  
  
\{

    "txnId": "4765527e\-\*\*\*\*\-\*\*\*\*\-91ec\-be039fbf60f8",

    "abhaAddressList": \[

        "doe\.1411",

        "johndoe",

        "john\_doe",

        "johndoe14",

        "johndoe\.14",

        "john\_14111998",

        "john\_1411",

        "john14111998",

        "john1411"

    \]

\}

__Error scenarios:__

__Scenario__

__Headers/Body__

__message__

When Invalid Transaction Id is passed

\{

    "txnId": "*\{\{Invalid transactionId\}\}*",

    "firstName": "John",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "email": ""

\}

 \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

Code – 400 Bad Request

When FirstName is Blank

\{

    "txnId": "\{\{transactionId\}\}",

    "firstName": "",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "email": ""

\}

\{

    "code": "ABDM\-1030: ",

    "message": "Invalid request ID"

\}

 

 

Code: 400Bad Request 

When invalid Invalid Day Of Birth is passed

\{

    "txnId": "*\{\{transactionId\}\}*",

    "firstName": "John",

    "lastName": "Doe",

    "dayOfBirth": "33",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "email": ""

\}

  \{

"code": "ABDM\-9999: ",

        "message": "Invalid Day Of Birth"

    \}

Code: 400Bad Request

When an Invalid Year Of Birth

\{

    "txnId": "\{\{transactionId\}\}",

    "firstName": "John",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "2025",

    "email": ""

\}

\{

        "code": "ABDM\-9999: ",

        "message": "Invalid Year Of Birth"

    \}

Code \- 400Bad Request

When an Invalid Month Of Birth is passed

\{

    "txnId": "*\{\{transactionId\}\}*",

    "firstName": "John",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "13",

    "yearOfBirth": "1998",

    "email": ""

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Month Of Birth"

\}\]

 

Code \- 400Bad Request

## <a id="_Toc176957921"></a>3\.9\. <a id="_Hlk176453178"></a>PHR\_Enrollment – ABHA Address Existence

This API will be invoked to check ABHA Address is exists or not in the system\.

  

__URL:__ /abha/api/v3/phr/app/enrollment/isExists

__Request:__ GET

__Header Parameters:__ 

Property Name

Example Value

Required

Description

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for tracking the end\-to\-end request transaction\.__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__The actual time when the request was initiated, ISO 8601 represents the date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds, and milliseconds\.__

Authorization

\{\{access\-token\}\}

Yes

JWT Access token which was issued by ABDM session API after successful validation of client id and secret\.

__Request Params:__

Property Name

Example Value

Description

abhaAddress

johndoe@sbx

ABHA Address to check if it exists

__Response Body:__ 

Response

__true__

  
Code : 200 OK

__Error scenarios:__

__Scenario__

__Headers/Body__

__message__

When Invalid ABHA address is passed

abhaAddress=johndoe123

 \{

        "code": "ABDM\-1006: ",

        "message": "Invalid ABHA Address"

    \}

Code – 400 Bad Request

When ABHA address not exist

abhaAddress=johndoe@abdm

__false__

 

 

Code: 200 OK 

When Bearer ACCESS\_TOKEN not provided

\{

    "txnId": "*\{\{transactionId\}\}*",

    "firstName": "John",

    "lastName": "Doe",

    "dayOfBirth": "33",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "email": ""

\}

"code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

    

Code \- 400Bad Request

## <a id="_Toc176957922"></a>3\.10\. PHR\_Enrollment – Registration of ABHA Address

After successful OTP verification, the user can create a new ABHA Address using this API\.

__URL: __/abha/api/v3/phr/app/enrollment/enrol

__Request: __POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2023\-03\-09T07:07:41\.793Z

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body parameters:__

Property Name

Example Value

Required

Description

txnId

22387064\-45ea\-42d4\-b6c5\-8b86dbec6fe5

Yes 

Unique id from table phr\_transaction table

phrDetails

\{

        "mobile": " *\{\{encrypted mobile\-number \}\}*",

        "firstName": "John",

        "middleName": "",

        "lastName": "Doe",

        "yearOfBirth": "1998",

        "dayOfBirth": "14",

        "monthOfBirth": "11",

        "gender": "M",

        "email": "",

        "profilePhoto": “photo”,

        "stateCode": "9",

        "districtCode": "135",

        "pinCode": 232101,

        "address": "Street number 4, sector 12",

        "stateName": "Maharashtra",

        "districtName": "Nashik",

        "ABHANumber": "XX\-XXXX\-XXXX\-1234",

        "abhaAddress": "johndoe@sbx",

        "password": "*\{\{ encrypted password\}\}*"

    \}

Yes

phr user details

__Request Body:__

Request Body

\{

    "txnId": "22387064\-45ea\-42d4\-b6c5\-8b86dbec6fe5",

    "phrDetails": \{

        "mobile": " *\{\{encrypted mobile\-number \}\}*",

        "firstName": "John",

        "middleName": "",

        "lastName": "Doe",

        "yearOfBirth": "1998",

        "dayOfBirth": "14",

        "monthOfBirth": "11",

        "gender": "M",

        "email": "",

        "profilePhoto": "\{\{base\-64\-encoded\-profile\-photo\}\}",

        "stateCode": "9",

        "districtCode": "135",

        "pinCode": 232101,

        "address": "Street number 4, sector 12",

        "stateName": "Maharashtra",

        "districtName": "Nashik",

        "ABHANumber": "XX\-XXXX\-XXXX\-1234",

        "abhaAddress": "johndoe@sbx",

        "password": "*\{\{encrypted password\}\}*"

    \}

\}

__Response Body__

__		__

Response:

Code : 200 OK  
  
\{

    "txnId": "6907ebb5\-\*\*\*\*\-47f9\-8052\-6dd5554df5df",

    "message": "ABHA Address Created Successfully",

    "phrDetails": \{

        "firstName": "John",

        "middleName": "",

        "lastName": "Doe",

        "fullName": "John Doe",

        "dayOfBirth": "14",

        "monthOfBirth": "11",

        "yearOfBirth": "1998",

        "dateOfBirth": "14\-11\-1978",

        "gender": "M",

        "email": "john\*\*\*\*\*\*\*\*\*\*\*\*\*\*@gmail\.com",

        "mobile": "\*\*\*\*\*\*1234",

        "address": "street number 4, sector 12",

        "stateName": "Maharashtra",

        "districtName": "Nashik",

        "pinCode": "123456",

        "abhaAddress": \[

            "john\.doe1@sbx",

            "johndoe@sbx",

            "johndoe1@sbx"

        \],

        "stateCode": "27",

        "districtCode": "123"

    \},

    "tokens": \{

         "token": "\{\{JWT\-X\-Token\}\}",

         "expiresIn": 1800,

         "refreshToken": "\{\{JWT\-R\-Token\}\}",

         "refreshExpiresIn": 1296000

    \}

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

When Invalid Transaction Id is passed 

\{

    "txnId": "*\{\{Invalid transactionId\}\}*",

    "phrDetails": \{

        "firstName": "John",

        "middleName": "",

        "lastName": "Doe",

        "dayOfBirth": "14",

        "monthOfBirth": "11",

        "yearOfBirth": "1998",

        "gender": "M",

        "email": "*\{\{Encrypted email\}\}*",

        "mobile": "*\{\{Encrypted mobile\}\}*",

        "address": "Street number 4, Sector 12",

        "stateName": "Maharashtra",

        "stateCode": "27",

        "districtName": "Nashik",

        "districtCode": "123",

        "pinCode": "422003",

        "abhaAddress": "john\.doe@sbx",

        "password": "*\{\{Encrypted PAssword\}\}*"

    \}

\}

\{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

Code : 400 Bad Request

To verify when Invalid First Name is passed

\{

    "txnId": "*\{\{transactionId\}\}*",

    "phrDetails": \{

        "firstName": "",

        "middleName": "",

        "lastName": "Doe",

        "dayOfBirth": "14",

        "monthOfBirth": "11",

        "yearOfBirth": "1998",

        "gender": "M",

        "email": "*\{\{Encrypted email\}\}*",

        "mobile": "*\{\{Encrypted mobile\}\}*",

        "address": "Street number 4, Sector 12",

        "stateName": "Maharashtra",

        "stateCode": "27",

        "districtName": "Nashik",

        "districtCode": "123",

        "pinCode": "422003",

        "abhaAddress": "john\.doe@sbx",

        "password": "*\{\{Encrypted PAssword\}\}*"

    \}

\}

 \{

        "code": "ABDM\-9999: ",

        "message": "Invalid First Name"

    \}

 

 Code: 400Bad Request 

When Invalid Day and Month of Birth is passed

\{

    "txnId": "*\{\{transactionId\}\}*",

    "phrDetails": \{

        "firstName": "John",

        "middleName": "",

        "lastName": "Doe",

        "dayOfBirth": "33",

        "monthOfBirth": "13",

        "yearOfBirth": "1998",

        "gender": "M",

        "email": "*\{\{Encrypted email\}\}*",

        "mobile": "*\{\{Encrypted mobile\}\}*",

        "address": "Street number 4, Sector 12",

        "stateName": "Maharashtra",

        "stateCode": "27",

        "districtName": "Nashik",

        "districtCode": "123",

        "pinCode": "422003",

        "abhaAddress": "john\.doe@sbx",

        "password": "*\{\{Encrypted PAssword\}\}*"

    \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Month Of Birth"

    \},

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Day Of Birth"

    \}

\]

Code : 400 Bad Request

When ABHA Address already exists

\{

    "txnId": "*\{\{ transactionId\}\}*",

    "phrDetails": \{

        "firstName": "John",

        "middleName": "",

        "lastName": "Doe",

        "dayOfBirth": "14",

        "monthOfBirth": "11",

        "yearOfBirth": "1998",

        "gender": "M",

        "email": "*\{\{Encrypted email\}\}*",

        "mobile": "*\{\{Encrypted mobile\}\}*",

        "address": "Street number 4, Sector 12",

        "stateName": "Maharashtra",

        "stateCode": "27",

        "districtName": "Nashik",

        "districtCode": "123",

        "pinCode": "422003",

        "abhaAddress": "johndoe@sbx",

        "password": "*\{\{Encrypted PAssword\}\}*"

    \}

\}

\{

    "code": "ABDM\-9999: ",

    "message": "This ABHA Address already exists\. Please create with unique ABHA address"

\}

Code : 400 Bad Request

## <a id="_Toc176957923"></a>3\.11 PHR\_Login – Login via Mobile Request\-OTP

If the login hint is mobile number, the OTP will be sent to the registered mobile number using this API\.

__URL: __/abha/api/v3/phr/app/login/request/otp

__Request: __POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2023\-03\-09T07:07:41\.793Z

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

 "abha\-address\-login", "mobile\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"mobile\-number"

Yes 

The registration methods can be provided 

loginId

"\{\{encrypted Mobile number\}\}"

Yes

Encrypted login id which can be mobile number

otpSystem

"abdm"

Yes

To verify method of otp system

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encrypted mobile\-number\}\}*",

    "otpSystem": "abdm"

\}

__Response Body:__ 

Response

Code : 200 OK   
  
\{

    "txnId": "b81a963d\-\*\*\*\-48b4\-\*\*\*\*\-acf9f23cfab7",

    "message": "OTP is sent to Mobile number ending with \*\*\*\*\*\*2425"

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

To verify when Invalid mobile number is passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{Invalid encrypted mobile\-number\}\}*",

    "otpSystem": "abdm"

\}

 \{

        "code": "ABDM\-1006: ",

        "message": "Invalid mobile number"

    \}

Code: 400Bad Request 

To verify when Invalid LoginId is passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "",

    "otpSystem": "abdm"

\}

\{

        "code": "ABDM\-9999: ",

        "message": "Invalid LoginId"

    \}

 

 Code: 400Bad Request 

When Invalid Scope is passed

\{

    "scope": \[

        "abha\-address\-login",

        "passworrd\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encrypted mobile\-number\}\}*",

    "otpSystem": "abdm"

\}

 \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Scope"

    \}

Code: 400 Bad Request

When Invalid Login Hint is passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "loginHint": "",

    "loginId": "*\{\{encrypted mobile\-number\}\}*",

    "otpSystem": "abdm"

\}

 \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Login Hint"

    \}

 

Code \- 400Bad Request

## <a id="_Toc176957924"></a>3\.12 <a id="_Hlk176453271"></a>PHR\_Login – Login via Mobile Verify\-OTP

After receiving the OTP, it will be validated and verified internally by calling the service to verify the mobile OTP for the given scope against the transaction ID using this API\. In response, all the ABHA addresses linked to the mobile number will be displayed\.

__URL:   __/abha/api/v3/phr/app/login/verify

__Request: __POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2023\-03\-09T07:07:41\.793Z

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

        "abha\-address\-login",

        "mobile\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

__  
Response Body:__ 

Code : 200 ok  
  
\{

    "txnId": "b81a963d\-4b97\-48b4\-9f9f\-acf8f13deab7",

    "message": "OTP verified successfully",

    "authResult": "success",

    "users": \[

       \{

            "abhaAddress": "johndoe@sbx",

            "fullName": "John Doe",

            "abhaNumber": "XX\-XXXX\-XXXX\-1234",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \},

        \{

            "abhaAddress": "johndoe2@sbx",

            "fullName": "John Doe",

            "status": "ACTIVE",

            "kycStatus": "PENDING"

        \}

    \],

    "tokens": \{

        "token":”\{\{encrypted\-T\-token\}\}”,

        "expiresIn": 300,

        "refreshToken": __null__,

        "refreshExpiresIn": __null__

    \}

\}

__Error scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Invalid Transaction Id

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ Invalid transactionId\}\}*",

            "otpValue": "*\{\{encryptedData\}\}*"

        \} \}

\}

 \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

   \}

Code: 400 Bad Request

When passing Invalid OTP

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\{

    "txnId": "637fbed4\-3f43\-443a\-a8dc\-18c34def2822",

    "message": "Entered OTP is incorrect\. Kindly re\-enter valid OTP\.",

    "authResult": "failed",

    "users": \[\]

\}

Code: 200 OK

When Invalid Auth Methods are passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password Request, Please enter valid ABHA Address or valid password"

    \}

\]

Code: 400Bad Request

When passing Invalid Scope 

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code: 400Bad Request

## <a id="_Toc176957927"></a>3\.13 <a id="_Hlk176453344"></a>PHR\_Login – Login using ABHA Number Request\-AADHAAR OTP 

This API is used if the login hint is ABHA Number, internally it will call ABHA profile service to send AADHAAR OTP for the given scope, login Hint, loginId and the otpSystem\. 

__URL:__ /abha/api/v3/phr/app/login/request/otp

__Request:__ POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

 "abha\-login",

        "aadhaar\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"abha\-number"

Yes 

The registration methods can be provided 

loginId

"\{\{encrypted *abha\-number* \}\}"

Yes

Encrypted login id which can be mobile number

otpSystem

" aadhaar "

Yes

To verify method of otp system

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

__Response Body:__ 

Response

Code : 200 OK   
  
\{

    "txnId": "04b2467d\-9f12\-4e8c\-b645\-334a6a8697de",

    "message": "OTP is sent to Aadhaar registered mobile number ending with \*\*\*\*\*\*\*1234"

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

To verify when Invalid LoginId is passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{invalid encrypted ABHA number\}\}*",

    "otpSystem": "aadhaar"

\}

\{

    "code": "ABDM\-9999",

    "message": "Invalid LoginId"

\}

 

 Code: 400Bad Request 

When Invalid Otp System is passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "abdm"

\}

   \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

Code: 400 Bad Request

When Invalid Login Hint is passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Login Hint"

    \}

\]

 

Code \- 400Bad Request

When Invalid Scope is passed

\{

    "scope": \[

        "abha\-address\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

\{

    "code": "ABDM\-1107",

    "message": "Invalid combinations of scopes"

\}

Code \- 400Bad Request

	

## <a id="_Toc176957928"></a>3\.14 <a id="_Hlk176453372"></a>PHR\_Login – Login using ABHA Number Verify\-AADHAAR OTP

After receiving the OTP, it will be validated and verified internally by calling the service to verify the Aadhaar OTP for the given scope and authData against the transaction ID using this API\.

__URL:__ /abha/api/v3/phr/app/login/verify

__Request:__ POST

__Header Parameters:__

Property Name

Example Value

Required

Description

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

"abha\-login",

  "aadhaar\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

  \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

Response

Code: 200 OK  
  
\{

    "txnId": "04b2454d\-9y12\-4e8c\-b675\-334a6a9697de",

    "message": "OTP Verified Successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "johndoe@sbx",

            "fullName": "John Doe",

            "abhaNumber": "XX\-XXXX\-XXXX\-1234",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \},

        \{

            "abhaAddress": "john\.doe@abdm",

            "fullName": "John Doe",

            "abhaNumber": "XX\-XXXX\-XXXX\-1234",

            "status": "ACTIVE",

            "kycStatus": "PENDING"

        \}

    \],

    "accounts": \[

        \{

            "mobile": "XXXXXX1234",

            "firstName": "John",

            "middleName": "",

            "lastName": "Doe",

            "name": "John Doe",

            "yearOfBirth": "1998",

            "dayOfBirth": "14",

            "monthOfBirth": "11",

            "gender": "M",

            "email": __null__,

            "profilePhoto": “\{\{base\-64\-encoded\-profile\-photo\}\}”,

            "status": "ACTIVE",

            "stateCode": "27",

            "districtCode": "488",

            "subDistrictCode": __null__,

            "villageCode": __null__,

            "townCode": __null__,

            "wardCode": __null__,

            "pincode": "422003",

            "address": "street number 4, sector 12",

            "kycPhoto": “\{\{base\-64\-encoded\-kyc\-photo\}\}”,

            "stateName": "MAHARASHTRA",

            "districtName": "NASHIK",

            "subdistrictName": "NASHIK",

            "villageName": __null__,

            "townName": "Nashik",

            "wardName": __null__,

            "authMethods": \[

                "DEMOGRAPHICS",

                "MOBILE\_OTP",

                "AADHAAR\_OTP",

                "AADHAAR\_BIO"

            \],

            "tags": \{\},

            "kycVerified": __true__,

            "verificationStatus": "VERIFIED",

            "verificationType": "AADHAAR",

            "emailVerified": __null__,

            "ABHANumber": "XX\-XXXX\-XXXX\-1234",

            "preferredAbhaAddress": "johndoe@abdm"

        \}

    \],

    "tokens": \{

         "token": "\{\{JWT\-X\-Token\}\}",

         "expiresIn": 1800,

         "refreshToken": "\{\{JWT\-R\-Token\}\}",

         "refreshExpiresIn": 1296000

    \}

\}

__Error scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Invalid Transaction Id

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{invalid transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}  \}\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code: 400 Bad Request

When passing Invalid OTP

\{

    "scope": \[

        "abha\-address\-login",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\{

    "txnId": "0bb3230e\-ebe4\-487b\-8093\-1cc37d5807ed",

    "message": "OTP did not match, please try again",

    "authResult": "failed",

    "users": \[\]

\}

Code: 200 OK

When Invalid Auth Methods are passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password Request, Please enter valid ABHA Address or valid password"

    \}

\]

Code: 400Bad Request

When passing Invalid Scope 

\{

    "scope": \[

        "abha\-address\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\{

    "code": "ABDM\-1107",

    "message": "Invalid combinations of scopes"

\}

Code: 400Bad Request

## <a id="_3.17_PHR_Login_–"></a><a id="_Toc176957929"></a>

## 3\.15 PHR\_Login – Login using AADHAAR Number Request\-AADHAAR OTP

This API is used if the login hint is AADHAAR Number, internally to call ABHA profile service to send AADHAAR OTP for the given scope, loginHint, loginId and the otpSystem\. 

__URL:__ /abha/api/v3/phr/app/login/request/otp

__Request:__ POST

__Header Parameters: __

Property Name

Example Value

Required

Description

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

 "abha\-login",

        "aadhaar\-verify",” aadhaar\-otp\-verify

”

Yes 

OTP will generate using notification service for the given scope

loginHint

"Aadhaar\-number"

Yes 

The registration methods can be provided 

loginId

"\{\{encrypted *Aadhaar\-number* \}\}"

Yes

Encrypted login id which can be mobile number

otpSystem

" aadhaar "

Yes

To verify method of otp system

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify",

         “aadhaar\-otp\-verify”

    \],

    "loginHint": "Aadhaar\-number",

    "loginId": "*\{\{encrypted Aadhaar\-number\}\}*",

    "otpSystem": "aadhaar"

\}

__Response Body:__ 

Response

Code : 200 OK   
  
\{

    "txnId": "84ca1c4b\-169d\-49f4\-8cf1\-d61e8235fb44",

    "message": "OTP sent to Aadhaar registered mobile number ending with \*\*\*\*\*\*1280"

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

To verify when Invalid LoginId is passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify",

         “aadhaar\-otp\-verify”

    \],

    "loginHint": "Aadhaar\-number",

    "loginId": "*\{\{invalid encrypted Aadhaar number\}\}*",

    "otpSystem": "aadhaar"

\}

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid aadhaar"

    \} 

 Code: 400Bad Request 

When Invalid Otp System is passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify",

         “aadhaar\-otp\-verify”

    \],

    "loginHint": "Aadhaar\-number",

    "loginId": "*\{\{ encrypted Aadhaar number\}\}*",

    "otpSystem": "\{\{Invalid OtpSystem\}\}"

\}

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Otp System"

    \}

Code: 400 Bad Request

When Invalid Login Hint is passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify",

         “aadhaar\-otp\-verify”

    \],

    "loginHint": "\{\{Invalid Aadhaar\-number\}\}",

    "loginId": "*\{\{ encrypted Aadhaar number\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Login Hint"

    \}

\] 

Code \- 400Bad Request

When Invalid Scope is passed

\{

    "scope": \[

        "abha\-login",

         “aadhaar\-otp\-verify”

    \],

    "loginHint": "Aadhaar\-number",

    "loginId": "*\{\{ encrypted Aadhaar number\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Scope"

    \}

\]

Code \- 400Bad Request

## <a id="_3.18_PHR_Login_–"></a>3\.16 PHR\_Login – Login using AADHAAR Number Verify\-AADHAAR OTP

After receiving the OTP, it will be validated and verified internally by calling the service to verify the Aadhaar OTP for the given scope and authData against the transaction ID using this API\. In response, all the ABHA addresses linked to the mobile number will be displayed\.

__URL:__ /abha/api/v3/phr/app/login/verify

__Request:__ POST

__Header Parameters:__

Property Name

Example Value

Required

Description

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

"abha\-login",

  "aadhaar\-verify",

"aadhaar\-otp\-verify"

Yes 

OTP will generate using notification service for the given scope

authData

  \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify",

        "aadhaar\-otp\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "c5077f32\-03c3\-43c3\-a5bd\-d27a48afba0f",

            "otpValue": "*\{\{encryptedData\}\}*"

        \}

    \}

\}

__Response Body:__ 

Response

Code : 200 OK   
  
\{

    "txnId": "c5077f32\-03c3\-43c3\-a5bd\-d27a48afba0f",

    "message": "OTP verified successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "kiranbornare5467@sbx",

            "fullName": "Kiran Vishwnath Bornare",

            "abhaNumber": "91\-2847\-5016\-2349",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \}

    \],

    "preferredAbhaAddress": "kiranbornare5467@sbx",

    "tokens": \{

        "token": ”\{\{encrypted\-T\-token\}\}”,

        "expiresIn": 300,

        "switchProfileEnabled": false

    \}

\}

__Error scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Invalid Transaction Id

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify",

         “aadhaar\-otp\-verify”

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{invalid transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}  \}\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code: 400 Bad Request

When passing Invalid OTP

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify",

         “aadhaar\-otp\-verify”

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{Invalid encrypted OTP\}\}*"

        \}  \}\}

\{

    "txnId": "390b3c77\-fc5d\-4eb4\-bf6f\-6276186b70f2",

    "message": "OTP expired, please try again",

    "authResult": "failed",

    "users": \[\]

\}

Code: 200 OK

When Invalid Auth Methods are passed

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Auth Methods"

    \}

\]

Code: 400Bad Request

When passing Invalid Scope 

\{

    "scope": \[

        "abha\-address\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code: 400Bad Request

## <a id="_3.19_PHR_Login_–_2"></a>3\.17 PHR\_Login – Login using ABHA Number Request\-Mobile OTP

This API is used if the login hint is ABHA Number, internally it will call ABHA profile service to send ABHA Linked Mobile OTP for the given scope, login Hint, loginId and the otpSystem\. 

__URL:__ /abha/api/v3/phr/app/login/request/otp

__Request:__ POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

         "abha\-login",

        "mobile\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"abha\-number"

Yes 

The registration methods can be provided 

loginId

"\{\{encrypted *abha\-number* \}\}"

Yes

Encrypted login id which can be mobile number

otpSystem

" abdm "

Yes

To verify method of otp system

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "abdm"

\}

__Response Body:__ 

Response

Code : 200 OK   
  
\{

    "txnId": "0a8bf133\-939e\-4c66\-9403\-5600c79ef663",

    "message": "OTP sent to mobile number ending with \*\*\*\*\*\*1280"

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

To verify when Invalid ABHA Number is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid abha\-number\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid ABHA Number"

    \}

\]

 Code: 400Bad Request 

When Invalid Otp System is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

\]

Code: 400 Bad Request

When Invalid Login Hint is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "aadhaar\-number",

    "loginId": "

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Login Hint"

    \}

\]

 

Code \- 400Bad Request

When Invalid Scope is passed

\{

    "scope": \[

        "abha\-login",

        "password\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code \- 400Bad Request

When No Auth is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "abdm"

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

## <a id="_3.20_PHR_Login_–_2"></a><a id="_Toc176957930"></a>3\.18 <a id="_Hlk176453418"></a>PHR\_Login – Login using ABHA Number Verify\-Mobile OTP  


After receiving the OTP, it will be validated and verified internally by calling the service to verify the ABHA OTP for the given scope and authData against the transaction ID using this API\. In response, all the ABHA addresses linked to the mobile number will be displayed\.

__URL: __/abha/api/v3/phr/app/login/verify

__Request:__ POST

__Header Parameters:__

Property Name

Example Value

Required

Description

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

"abha\-login",

        "mobile\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

  

     \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

Response:

Code: 200 OK  
  
\{

    "txnId": "0a8bf133\-939e\-4c66\-9403\-5600c79ef663",

    "message": "OTP verified successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "kiranborn\_407@sbx",

            "fullName": "Kiran Vishwnath Bornare",

            "abhaNumber": "91\-6508\-0354\-4479",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \},

  

        \{

            "abhaAddress": "manish10667@sbx",

            "fullName": "Kiran Vishwnath Bornare",

            "abhaNumber": "91\-6508\-0354\-4479",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \}

    \],

    "preferredAbhaAddress": "damini1407@sbx",

    "tokens": \{

        "token": ”\{\{encrypted\-T\-token\}\}”,

        "expiresIn": 300,

        "switchProfileEnabled": false

    \}\}

__Error scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Invalid Transaction Id

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{Invalid transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}  \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code: 400 Bad Request

When passing Invalid OTP

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\{

    "txnId": "afe335a3\-524e\-4035\-924f\-b22e38b99e1e",

    "message": "Please enter a valid OTP\. Entered OTP is either expired or incorrect\.",

    "authResult": "failed",

    "users": \[\]

\}

Code: 200 OK

When Invalid Auth Methods are passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password Request, Please enter valid ABHA Address or valid password"

    \}

\]

Code: 400Bad Request

When passing Invalid Scope 

\{

    "scope": \[

       

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code: 400Bad Request

When NO\-Auth is passed

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

__NOTE:__ \- 

1. For users logging in with a KYC verified ABHA address, only the list of KYC verified ABHA addresses should be displayed\.
2. For users logging in with a KYC verified and non\-KYC ABHA address, list of KYC verified and KYC Pending ABHA addresses should be displayed\.

<a id="_3.21_PHR_Login_–_1"></a>

## <a id="_3.19_PHR_Login_–_1"></a>

## <a id="_3.19_PHR_Login_–"></a><a id="_3.21__PHR_Login"></a><a id="_3.24__PHR_Login"></a><a id="_3.19__PHR_Login"></a>3\.19  PHR\_Login – Login using ABHA ADDRESS Request\-MOBILE OTP

This API is used to send an OTP to the mobile number linked to an ABHA address by passing the required scope, login hint, login ID, and OTP system\. For this, the login hint should be the ABHA address\.

__URL:__ /abha/api/v3/phr/app/login/request/otp

__Request:__ POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

         " abha\-address\-login

",

        "mobile\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

" abha\-address"

Yes 

The registration methods can be provided 

loginId

"\{\{encrypted *abha\-address* \}\}"

Yes

Encrypted login id which can be mobile number

otpSystem

" abdm "

Yes

To verify method of otp system

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-address",

    "loginId": "*\{\{encryptedData\}\}*",

    "otpSystem": "abdm"

\}

__Response Body:__ 

Response

Code : 200 OK   
  
\{

    "txnId": "09ffb39c\-4f25\-4329\-aa23\-2f08ecf53afb",

    "message": "OTP is sent to Mobile number ending with \*\*\*\*\*\*1280"

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

To verify when Invalid ABHA Address is passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-address",

    "loginId": "*\{\{encryptedData\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid ABHA Number"

    \}

\]

 Code: 400Bad Request 

When Invalid Otp System is passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-address",

    "loginId": "*\{\{encryptedData\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

\]

Code: 400 Bad Request

When Invalid Login Hint is passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

"loginHint": "abha\-number",

    "loginId": "\{\{encrypted abha\-number\}\}",

    "otpSystem": "abdm"

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Login Hint"

    \}

\]

 

Code \- 400Bad Request

When Invalid Scope is passed

\{

    "scope": \[

        "abha\-address\-login",

        "password\-verify"

    \],

    "loginHint": "abha\-address",

    "loginId": "*\{\{encryptedData\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code \- 400Bad Request

When No Auth is passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-address",

    "loginId": "*\{\{encryptedData\}\}*",

    "otpSystem": "aadhaar"

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

## <a id="_3.20_PHR_Login_–"></a>3\.20 PHR\_Login – Login using ABHA Address Verify\-MOBILE OTP  


After receiving the OTP, it will be validated and verified internally by calling the service to verify the MOBILE OTP for the given scope and authData against the transaction ID using this API\. In response, user will get the X\-token to access the user login profile\.

__URL: __/abha/api/v3/phr/app/login/verify

__Request:__ POST

__Header Parameters:__

Property Name

Example Value

Required

Description

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

"abha\-address\-login",

        "mobile\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

  

     \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encryptedOtp\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encryptedData\}\}*"

        \}

    \}

\}

Response:

Code: 200 OK  
  
\{

    "message": "OTP verified successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "kiran\_1997199711@sbx",

            "fullName": "Kiran Vishwnath Bornare",

            "abhaNumber": "91\-6508\-0354\-4479",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \}

    \],

    "tokens": \{

        "token": ”\{\{JWT\-X\-token\}\}”,

        "expiresIn": 1800,

        "refreshToken": "\{\{JWT\-R\-Token\}\}",

        "refreshExpiresIn": 1296000,

        "switchProfileEnabled": false

    \}

\}

__Error scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Invalid Transaction Id

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{Invalid transactionId\}\}*",

            "otpValue": "*\{\{encryptedData\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code: 400 Bad Request

When passing Invalid OTP

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\{

    "txnId": "afe335a3\-524e\-4035\-924f\-b22e38b99e1e",

    "message": "Please enter a valid OTP\. Entered OTP is either expired or incorrect\.",

    "authResult": "failed",

    "users": \[\]

\}

Code: 200 OK

When Invalid Auth Methods are passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password Request, Please enter valid ABHA Address or valid password"

    \}

\]

Code: 400Bad Request

When passing Invalid Scope 

\{

    "scope": \[

        "abha\-login",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

     \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code: 400Bad Request

When NO\-Auth is passed

\{

    "scope": \[

        "abha\-address\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encryptedData\}\}*"

        \}

    \}

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

__NOTE__: \- When logging in with an ABHA address, the "Switch Profile" option should not be displayed\.

## <a id="_3.24_PHR_Login_–_1"></a><a id="_Toc176957925"></a>3\.21 <a id="_Hlk176453296"></a>PHR\_Login – Login using ABHA ADDRESS Request\-EMAIL OTP\(Optional\)

<a id="OLE_LINK6"></a><a id="OLE_LINK18"></a>This API is used to send an OTP to the EMAIL linked to an ABHA address by passing the required scope, login hint, login ID, and OTP system\. For this, the login hint should be the ABHA address

__Note:__ This login functionality is available for the integrator, not for the ABHA app\.

__URL:__ /abha/api/v3/phr/app/login/request/otp

__Request:__ POST

__Header Parameters: __

<a id="OLE_LINK329"></a><a id="OLE_LINK330"></a><a id="OLE_LINK337"></a><a id="OLE_LINK346"></a><a id="OLE_LINK353"></a>Property Name

Example Value

Required

Description

<a id="_Hlk126329618"></a>Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2023\-03\-09T07:07:41\.793Z

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

<a id="OLE_LINK8"></a>

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

"abha\-address\-login",

        "email\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"email"

Yes 

The registration methods can be provided 

loginId

"*\{\{encrypted email\}\}*"

Yes

Encrypted login id which can be mobile number

otpSystem

"abdm"

Yes

To verify method of otp system

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-address\-login",

        "email\-verify"

    \],

    "loginHint": "email",

    "loginId": "*\{\{encrypted email\}\}*",

    "otpSystem": "abdm"

\}

__Response Body:__ 

Response

Code : 200 OK   
  
\{

    "txnId": "b81a965d\-4b97\-48b4\-9f9f\-acf9f14afab7",

    "message": "OTP is sent to email ending with john\*\*\*\*\*\*\*\*\*\*@gmail\.com"

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

To verify when  Invalid Email Id is passed

\{

    "scope": \[

        "abha\-address\-login",

        "email\-verify"

    \],

    "loginHint": "email",

    "loginId": "*\{\{encrypted invalid email\}\}*",

    "otpSystem": "abdm"

\}

 \[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Email Id"

    \}

\]

Code: 400Bad Request 

To verify when Invalid Otp System is passed

\{

    "scope": \[

        "abha\-address\-login",

        "email\-verify"

    \],

    "loginHint": "email",

    "loginId": "*\{\{encrypted email\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

\]

 

 Code: 400Bad Request 

When Invalid Login Hint is passed

\{

    "scope": \[

        "abha\-address\-login",

        "email\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encrypted email\}\}*",

    "otpSystem": "abdm"

\}

 \[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Login Hint"

    \}

\]

Code: 400 Bad Request

When  Invalid Scope is passed

\{

    "scope": \[

        "email\-verify"

    \],

    "loginHint": "email",

    "loginId": "*\{\{encrypted email\}\}*",

    "otpSystem": "abdm"

\}

 \[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

 

Code \- 400Bad Request

## <a id="_3.25_PHR_Login_–_1"></a>3\.22 <a id="_Hlk176453319"></a>PHR\_Login – Login using ABHA Address Verify\-EMAIL OTP\(Optional\)

After receiving the OTP, it will be validated and verified internally by calling the service to verify the EMAIL OTP for the given scope and authData against the transaction ID using this API\. In response, user will get the X\-token to access the user login profile\.

__URL:__ /abha/api/v3/phr/app/login/verify

__Request:__ POST

__Header Parameters:__

Property Name

Example Value

Required

Description

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

<a id="OLE_LINK9"></a><a id="OLE_LINK12"></a>__Body Parameters:__

Property Name

Example Value

Required

Description

scope

       "abha\-address\-login"

           "email\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

 \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

Request Body:

\{

    "scope": \[

        "abha\-address\-login",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

Response

Code: 200 OK  
  
\{

    "txnId": "b81a863d\-4b97\-38b4\-9f9f\-acf9f13affb7",

    "message": "OTP verified successfully",

    "authResult": "success",

    "users": \[

       \{

            "abhaAddress": "johndoe@sbx",

            "fullName": "John Doe",

            "abhaNumber": "XX\-XXXX\-XXXX\-1234",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \}

    \],

    "tokens": \{

        "token": ”\{\{encrypted\-T\-token\}\}”,

        "expiresIn": 300,

        "refreshToken": __null__,

        "refreshExpiresIn": __null__

    \}

\}

__Error scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Invalid Transaction Id

\{

    "scope": \[

        "abha\-address\-login",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "1*\{\{transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code: 400 Bad Request

When passing Invalid OTP

\{

    "scope": \[

        "abha\-address\-login",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\{

    "txnId": "0bb3230e\-ebe4\-487b\-8093\-1cc37d5807ed",

    "message": "OTP did not match, please try again",

    "authResult": "failed",

    "users": \[\]

\}

Code: 200 OK

When Invalid Auth Methods are passed

\{

    "scope": \[

        "abha\-address\-login",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"     \}  \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password Request, Please enter valid ABHA Address or valid password"

    \}

\]

Code: 400Bad Request

When passing Invalid Scope 

\{

    "scope": \[

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted otp\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code: 400Bad Request

## <a id="_3.21_PHR_Login_–"></a><a id="_3.26_PHR_Login_–"></a><a id="_Toc176957931"></a>3\.23 <a id="OLE_LINK315"></a><a id="OLE_LINK316"></a><a id="_Toc137562509"></a>PHR\_Login – Login using Password Search user                            								                                     

This API will internally call service to get the ABHA Address details along with auth methods for given ABHA address as a input\. 

 

__URL:__ /abha/api/v3/phr/app/login/search__ __

__Request:__ POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

__The actual time when the request was initiated, ISO Date time format represents the date and time__

__Body Parameters: __

<a id="OLE_LINK383"></a><a id="OLE_LINK384"></a>Property Name

Example Value

Required

Description

abhaAddress

johndoe@sbx

Yes

The ABHA Address is used for linking health records across multiple systems\. These ABHA Address can be obtained by enrolling in multiple ways namely using ABHA number, mobile number, email id and Aadhaar number\.

__Request Body: __

<a id="OLE_LINK380"></a><a id="OLE_LINK381"></a><a id="OLE_LINK382"></a>Request Body:

\{

    "abhaAddress": "johndoe@sbx"

\}

__Response: __

Response

Code : 200 ok   
  
\{

    "healthIdNumber": "XX\-XXXX\-XXXX\-1234",

    "abhaAddress": "johndoe@sbx",

    "authMethods": \[

        "MOBILE\_OTP",

        "PASSWORD",

        "EMAIL\_OTP",

        "AADHAAR\_OTP"

    \],

    "blockedAuthMethods": \[\],

    "status": "ACTIVE",

    "message": __null__

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

Verify when ABHA no\. not linked

\{

    "abhaAddress": "johndoe@sbx"

\}

\{

    "healthIdNumber": null,

    "abhaAddress": "john\.doe@sbx",

    "authMethods": \[

        "EMAIL\_OTP",

        "MOBILE\_OTP",

        "PASSWORD"

    \],

    "blockedAuthMethods": \[\],

    "status": "ACTIVE",

    "message": null,

    "fullName": "John Doe",

    "mobile": "XXXXXX1234"

\}

Code: 200 ok 

Verify when User not exist

\{

    "abhaAddress": "john\.doe123@sbx"

\}

\{

    "code": "ABDM\-1211",

    "message": "User not found\."

\}

400 Bad Request

Invalid ABHA Address

 is passed

\{

    "abhaAddress": ""

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid ABHA Address"

    \}

\]

Code \- 400Bad Request

When No Auth is passed

\{

    "abhaAddress": "john\.doe@sbx"

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code: 401 Unauthorized

## <a id="_3.22_PHR_Login_–"></a><a id="_3.24_PHR_Login_–"></a><a id="_3.27_PHR_Login_–"></a><a id="_Toc176957932"></a>3\.24 <a id="_Hlk176453470"></a><a id="OLE_LINK317"></a><a id="OLE_LINK318"></a><a id="_Toc137562511"></a>PHR\_Login – Verify using Password      
                      	                                                                                                                                            

This API is used to verify the password\. Once the password is verified, the user is allowed to log in successfully\. In response, the user will receive their details, which include information such as the ABHA address, full name, ABHA number, status, KYC status, and all other available information along with the X\-token to access the user login profile\.

__URL:__ /abha/api/v3/phr/app/login/verify__ __

__Request:__ POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

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

__Body Parameters: __

Property Name

Example Value

Required

Description

scope

"abha\-address\-login",

        "password\-verify"

 

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

  

\{

        "authMethods": \[

            "password"

        \],

        "password": \{

            "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted password\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body: __

<a id="OLE_LINK386"></a><a id="OLE_LINK387"></a>Request Body:

   \{

    "scope": \[

        "abha\-address\-login",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "password": \{

            "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted password\}\}*"

        \}

    \}

\}

__Response: __

Response:

Code : 200 ok   
  
\{

    "message": "Password verified successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "johndoe@sbx",

            "fullName": "John Doe",

            "abhaNumber": "XX\-XXXX\-XXXX\-1234",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \}

    \],

    "tokens": \{

         "token": "\{\{JWT\-X\-Token\}\}",

        "expiresIn": 1800,

        "refreshToken": "\{\{JWT\-R\-Token\}\}",

        "refreshExpiresIn": 1296000

    \}

\}

__Error scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Invalid password

\{

    "scope": \[

        "abha\-address\-login",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": 

        \[

            "password"

        \],

        "password": 

        \{

            "abhaAddress": "johndoe@sbx",

            "password": "*\{\{invalid encrypted password\}\}*"

        \}

    \}

\}

\{

    "message": "Password did not match, please try again",

    "authResult": "failed",

    "users": \[\]

\}

Code: 200 OK

When Invalid Auth Methods are passed

\{

    "scope": \[

        "abha\-address\-login",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": 

        \[

            "otp"

        \],

        "password": 

        \{

            "abhaAddress": "johndoe@sbx",

            "password": "*\{\{Encrypted password\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \}

\]

Code: 400Bad Request

When passing Blank password

\{

    "scope": \[

        "abha\-address\-login",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": 

        \[

            "password"

        \],

        "password": 

        \{

            "abhaAddress": "johndoe@sbx",

            "password": ""

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password"

    \}

\]

Code: 400Bad Request

When passing Invalid Scope 

\{

    "scope": \[

        "abha\-address\-login"

    \],

    "authData": \{

        "authMethods": 

        \[

            "password"

        \],

        "password": 

        \{

            "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted password\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code: 400Bad Request

## <a id="_3.23_PHR_Login_–"></a><a id="_3.25_PHR_Login_–"></a><a id="_3.28_PHR_Login_–"></a><a id="_Toc137562512"></a><a id="_Toc176957933"></a>3\.25 <a id="_Hlk176453496"></a><a id="OLE_LINK319"></a><a id="OLE_LINK320"></a><a id="_Toc137562513"></a>PHR\_Login – Verify User	

This is a common API used to verify the user from the list of ABHA addresses received in the response of verify OTP/face authentication API\. In response, the user will receive the X\-token for the selected ABHA address from the list\.

__URL:__ /abha/api/v3/phr/app/login/verify/user

__Request:__ POST

__Header Parameters: __

<a id="OLE_LINK390"></a><a id="OLE_LINK391"></a><a id="OLE_LINK396"></a>Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

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

__Body Parameters: __

<a id="OLE_LINK394"></a><a id="OLE_LINK395"></a>Property Name

Example Value

Required

Description

abhaAddress

johndoe@abdm

Yes

The ABHA Address is used for linking health records across multiple systems\. These ABHA Address can be obtained by enrolling in multiple ways namely using ABHA number, mobile number, email id and Aadhaar number\.

txnId

“123456”

Yes

Unique transaction Id

__Request Body: __

<a id="OLE_LINK392"></a><a id="OLE_LINK393"></a>Request Body

\{

    "abhaAddress":"johndoe@abdm",

    "txnId":"*\{\{transactionId\}\}*"

\}

__Response:__

Response

Code : 200 ok   
  
\{

   "token": "\{\{JWT\-X\-Token\}\}",

       "expiresIn": 1800,

       "refreshToken": "\{\{JWT\-R\-Token\}\}",

       "refreshExpiresIn": 1296000

\}

__Error scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Transaction Id

\{

    "abhaAddress":"johndoe@sbx",

    "txnId":"1407dee37\-925d\-4d43\-ba62\-b4e9cb240258"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code: 400 Bad Request

When Invalid  ABHA address passed

\{

    "abhaAddress":"invalidabha@sbx",

    "txnId":"82e229f1\-f8ea\-4829\-add9\-b98e19fd5c2f"

\}

\{

    "code": "ABDM\-9999: ",

    "message": "User not found\."

\}

Code: 400Bad Request

When Blank ABHA address

\{

    "abhaAddress":"",

    "txnId":"824227f1\-f8ea\-4829\-add9\-b98e19fd5c3f"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid ABHA Address"

    \}

\]

Code: 400Bad Request

When passing  without T token

\{

    "abhaAddress":"johndoe@sbx",

    "txnId":"82e229f1\-f8ea\-4829\-add9\-b98e19fd5c2f"

\}

Access Denied

Code: 403 Forbidden

## <a id="_3.24_PHR_Profile_-"></a><a id="_3.26_PHR_Profile_-"></a><a id="_3.29_PHR_Profile_-"></a><a id="_Toc137562514"></a><a id="_Toc176957934"></a>3\.26 <a id="OLE_LINK321"></a><a id="OLE_LINK322"></a><a id="_Toc137562515"></a>PHR\_Profile \- Update Mobile Request\-OTP								  
This API allows users to update their mobile number\. An OTP is sent to the new mobile number for verification, and once verified, the new number is updated in the system\.

__URL:__ /abha/api/v3/phr/app/login/profile/request/otp

__Request:__ POST

__Header Parameters: __

Property Name

Example Value

Required

Description

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for tracking the end\-to\-end request transaction 

TIMESTAMP 

2022\-10\-06T10:10:00\.587Z 

Yes 

Actual time when request was initiated, ISO Date time format represents date and time

Authorization

\{\{access\-token\}\}

Yes

JWT Access token which was issued by ABDM session API after successful validation of client id and secret

__Body Parameters: __

Property Name

Example Value

Required

Description

scope

"abha\-address\-enroll", "mobile\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"mobile\-number"

Yes 

The registration methods can be provided 

loginId

""\{\{encrypted Mobile number\}\}"

Yes

Encrypted login id which can be mobile number

otpSystem

"abdm"

Yes

To verify method of otp system

__Request Body: __

<a id="OLE_LINK397"></a><a id="OLE_LINK398"></a><a id="OLE_LINK399"></a>Request Body:

 \{

    "scope": \[

        "abha\-address\-profile",

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encrypted mobile\-number\}\}*",

    "otpSystem": "abdm"

\}

__  
Response: __

Response

Code : 200 ok  
  
\{

    "txnId": "d51cebdf\-95f5\-480c\-5689\-jdwkw2345",

    "message": "OTP is sent to Mobile number ending with \*\*\*\*\*\*1234"

\}

__Error scenarios:__

__Scenario__

__Request Headers/Body__

__Message__

When passing invalid mobile number

\{

    "scope": \[

        "abha\-address\-profile",

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encrypted mobile\-number\}\}*",

    "otpSystem": "abdm"

\}

 \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Mobile Number"

    \}

Code: 400 Bad Request 

When passing invalid otp system 

\{

    "scope": \[

        "abha\-address\-profile",

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "\{\{encrypted mobile\-number\}\}",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

\]

Code: 400 Bad Request 

 

When passing invalid Login Hint

\{

    "scope": \[

        "abha\-address\-profile",

        "mobile\-verify"

    \],

    "loginHint": "",

    "loginId": "*\{\{encrypted mobile\-number\}\}*",

    "otpSystem": "abdm"

\}

 \[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Login Hint"

    \}

\]

Code : \- 400 Bad Request

When passing invalid scope

\{

    "scope": \[

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "\{\{encrypted mobile\-number\}\}",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code : \- 400 Bad Request

When passing the incorrect credentials 

\{

    "scope": \[

        "abha\-address\-profile",

        "mobile\-verify"

    \],

    "loginHint": "mobile\-number",

    "loginId": "*\{\{encrypted mobile\-number\}\}*",

    "otpSystem": "abdm"

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code :\- 401 Unauthorized

## <a id="_3.25_PHR_Profile_–"></a><a id="_Toc137562516"></a><a id="_Toc176957935"></a>3\.27 <a id="OLE_LINK323"></a><a id="OLE_LINK324"></a><a id="_Toc137562517"></a>PHR\_Profile – Update Mobile Verify\-OTP	  
                                                               

This API is used to verify OTP and update the mobile number in the system\.

__URL:__ /abha/api/v3/phr/app/login/profile/verify

__Request:__ POST

__Header Parameters:__

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

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

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

        "abha\-address\-profile",

        "mobile\-verify"

 

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

  

\{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__

Request Body:

\{

     "scope": \[

        "abha\-address\-profile",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

__Response:__

Response

Code : 200 ok  
  
\{

    "txnId": "d01cebdf\-95f5\-480c\-8289\-6f4b218e7288",

    "message": "Mobile Number linked successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "johndoe@sbx"

        \}

    \]

\}

__Error Scenarios:__

__Scenario__

__Headers/Body__

__Message__

When passing Invalid transaction id

\{

    "scope": \[

        "abha\-address\-profile",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{invalid transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code : \- 400 Bad Request\.

When invalid otp 

\{

     "scope": \[

        "abha\-address\-profile",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\{

    "txnId": "e10ca603\-97f5\-4cf2\-8100\-d51ea7db9995",

    "message": "Entered OTP is incorrect\. Kindly re\-enter valid OTP\.",

    "authResult": "failed",

    "users": \[\]

\}

Code: 200 Ok

When invalid Auth methods 

\{

     "scope": \[

        "abha\-address\-profile",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "otp": \{

           "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password Request, Please enter valid ABHA Address or valid password"

    \}

\]

Code : \-  400Bad Request 

When invalid scope

\{

    "scope": \[

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\{

    "code": "ABDM\-1016: ",

    "message": "Invalid Timestamp"

\}

Code \- 400Bad Request

\{

     "scope": \[

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code : \- 401 Unauthorized

When no auth methods

## <a id="_3.26_PHR_Profile_–"></a><a id="_Toc176957936"></a>3\.28 <a id="OLE_LINK325"></a><a id="OLE_LINK326"></a><a id="_Toc137562519"></a>PHR\_Profile – Update Email Request\-OTP				

## This API allows users to update their EMAIL\. An OTP is sent to the new EMAIL for verification, and once verified, the new number is updated in the system\.

\.

<a id="_Hlk176455068"></a>

__URL:__ /abha/api/v3/phr/app/login/profile/request/otp

__Request:__ POST

__Header Parameters:__

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

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

__Body Parameters:__

Property Name

Example Value

Required

Description

scope

"abha\-address\-profile",

        "email\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"email"

Yes 

The registration methods can be provided 

loginId

"\{\{encrypted email\}\}"

Yes

Encrypted login id which can be mobile number

otpSystem

" abdm "

Yes

To verify method of otp system

__Request Body:__

Request Body

\{

    "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "loginHint": "email",

    "loginId": "\{\{encrypted email\}\}",

    "otpSystem": "abdm"

\}    

__Response:__

Response

Code : Undefined  
  
\{

    "txnId": "d01cebdf\-95f5\-480c\-8288\-6f3b218e7222",

    "message": "OTP is sent to email ending with john\*\*\*\*@gmail\.com"

\}

__Error scenarios:__

Scenarious

Headers/body

message

When invalid email id

\{

    "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "loginHint": "email",

    "loginId": "*\{\{encrypted invalid email\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Email Id"

    \}

\]

Code : \-400  Bad Request

When invalid otp  system

\{

    "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "loginHint": "email",

    "loginId": "*\{\{encrypted email\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

\]

Code : \- 400 Bad Request

When invalid login Hint

\{

    "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "loginHint": "",

    "loginId": "*\{\{encrypted email\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Login Hint"

    \}

\]

Code : \- 400 Bad Request

When invalid Scope

\{

    "scope": \[

        "email\-verify"

    \],

    "loginHint": "email",

    "loginId": "*\{\{encrypted email\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code : \- 400 Bad Request

When no auth methods

\{

    "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "loginHint": "email",

    "loginId": "*\{\{encrypted email\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code :\- 400 Bad Request

## <a id="_3.27_PHR_Profile_–"></a><a id="_Toc176957937"></a>3\.29 <a id="_Hlk176781202"></a><a id="_Toc132719033"></a><a id="_Toc132725170"></a><a id="_Toc132725329"></a><a id="_Toc132882472"></a><a id="_Toc137632478"></a><a id="_Toc137653762"></a><a id="OLE_LINK421"></a><a id="OLE_LINK422"></a>PHR\_Profile – Update Email Verify\-OTP					

This API is used to verify EMAIL OTP and update the EMAIL in the system\.

__URL:__ /abha/api/v3/phr/app/login/profile/verify

__Request:__ POST

__Header Parameters:__ 

<a id="OLE_LINK126"></a><a id="OLE_LINK127"></a><a id="OLE_LINK186"></a><a id="OLE_LINK488"></a><a id="OLE_LINK489"></a>Property Name

Example Value

Required

Description

Authorization

\{\{access\-token\}\}

Yes

JWT Access token which was issued by ABDM session API after successful validation of client id and secret

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

Unique UUID for track the end to end request transaction

<a id="_Hlk126057763"></a>TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time__

__Body Parameters:__ 

Property Name

Example Value

Required

Description

scope

        "abha\-address\-profile",

        "email\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

 \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

\}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__ 

Request Body

  \{

     "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

__Response Body:__ 

Response

Code : undefined   
  
\{

    "txnId": "d01cebdf\-95f5\-000c\-5555\-6f3b218e888",

    "message": "Email linked successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "johndoe@sbx"

        \}

    \]

\}

__Error Scenarios:__

Scenarious

Headers/body

message

When invalid email transaction id

\{

     "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

           "txnId": "*\{\{invalid transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code : \- 400 Bad Request

When e mail invalid otp system

\{

     "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\{

    "txnId": "e10ca600\-97f5\-4cf2\-5555\-d51ea7db8888",

    "message": "Entered OTP is incorrect\. Kindly re\-enter valid OTP\.",

    "authResult": "failed",

    "users": \[\]

\}

Code : \-200 Ok

When invalid auth methods

\{

     "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password Request, Please enter valid ABHA Address or valid password"

    \}

\]

Code : \- 400 Bad Request

When invalid Scope

\{

     "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code : \- 400 Bad Request

When no auth methods

\{

     "scope": \[

        "abha\-address\-profile",

        "email\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue":"*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code :\-401 quest

## <a id="_3.28_PHR_Profile_–"></a><a id="_3.33_PHR_Profile_–"></a><a id="_Toc176957938"></a>3\.30 <a id="_Hlk176781236"></a>PHR\_Profile – Update Password

This API is used to update the password of the user account after login\. By verifying if the new password is not the same as the old password, user can update the password\.

__URL__: /abha/api/v3/phr/app/login/profile/verify 

__Request:__ POST

__Header Parameters:__ 

Property Name

Example Value

Required

Description

Authorization

\{\{access\-token\}\}

Yes

JWT Access token which was issued by ABDM session API after successful validation of client id and secret

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

Unique UUID for track the end to end request transaction

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time__

__Body Paramaters:__ 

Property Name

Example Value

Required

Description

scope

"abha\-address\-profile",

        "password\-verify"

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

 \{

        "authMethods": \[

            "password"

        \],

        "password": \{

            "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted new password\}\}*"

        \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body:__ 

Request Body

\{

    "scope": \[

        "abha\-address\-profile",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "password": \{

            "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted new password\}\}*"

        \}

    \}

\}

__Response Body:__ 

Response

Code : 200 OK  
  
\{

    "message": "Password updated successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "johndoe@sbx"

        \}

    \]

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

When no auth methods

\{

    "scope": \[

        "abha\-address\-profile",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "password": \{

            "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted new password\}\}*"

        \}

    \}

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code : \- 401 Unauthorized 

When no x\-token

\{

    "scope": \[

        "abha\-address\-profile",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "password": \{

           "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted new password\}\}*"

        \}

    \}

\}

 

 Access Denied 

Code  : \- 403 Forbidden

When invalid password

\{

    "scope": \[

        "abha\-address\-profile",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "password": \{

           "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted new password\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password"

    \}

\]

Code:\- 400 Bad Request

Invalid ABHA Address

\{

    "scope": \[

        "abha\-address\-profile",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "password": \{

           "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted new password\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid ABHA Address"

    \}

\]

Code:\- 400 Bad Request

When invalid auth methods

\{

    "scope": \[

        "abha\-address\-profile",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "password": \{

           "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted new password\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \}

\]

Code:\- 400 Bad Request

When invalid scope

\{

    "scope": \[

        "abha\-address\-profile",

        "password\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "password"

        \],

        "password": \{

           "abhaAddress": "johndoe@sbx",

            "password": "*\{\{encrypted new password\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password"

    \}

\]

Code :\- 400 Bad Request

## <a id="_3.29_PHR_Profile_–"></a><a id="_3.31_PHR_Profile_–"></a><a id="_Toc176957939"></a>3\.31 PHR\_Profile – Link ABHA number via Mobile\-Request OTP

<a id="OLE_LINK196"></a><a id="OLE_LINK197"></a>This API is used to link an ABHA number with an ABHA address\. An OTP will

be sent to the mobile number linked to the ABHA number for verification\.

__URL:__ /abha/api/v3/phr/app/login/profile/request/otp__ __

__Request:__ POST

__Header Parameters: __

<a id="OLE_LINK198"></a><a id="OLE_LINK199"></a><a id="OLE_LINK435"></a>__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time\.__

Authorization

\{\{access\-token\}\}

Yes

__Authentication token for user__

__Body Paramaters: __

Property Name

Example Value

Required

Description

scope

         "abha\-login",

        "mobile\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"abha\-number"

Yes 

The registration methods can be provided 

loginId

"\{\{encrypted *abha\-number* \}\}"

Yes

Encrypted login id which can be mobile number

otpSystem

" abdm "

Yes

To verify method of otp system

__Request Body: __

<a id="OLE_LINK202"></a><a id="OLE_LINK203"></a><a id="OLE_LINK436"></a>Request Body:

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number", // 

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "abdm"

\}

__Response Body__: 

<a id="OLE_LINK204"></a><a id="OLE_LINK205"></a><a id="OLE_LINK437"></a>Response

Code : 200 OK   
  
\{

    "txnId": "d8bd3f91\-e615\-4bd8\-a6b6\-f18f08cad1b9",

    "message": "OTP sent to mobile number ending with \*\*\*\*\*\*1234"

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

when  Link – Delink No X\-Token

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid abha\-number\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid ABHA Number"

    \}

\]

Code :\- 400 Bad Request

when  Link – Delink invalid otp System

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid abha\-number\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

\]

Code:\- 400 Bad Request

When invalid login Hint

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid abha\-number\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Login Hint"

    \}

\]

Code:\- 400 Bad Request

When invalid scope

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid abha\-number\}\}*",

    "otpSystem": "abdm"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Scope"

    \}

\] Code :\- 400 Bad Request

## <a id="_3.30_PHR_Profile_–"></a><a id="_3.35_PHR_Profile_–"></a><a id="_Toc176957940"></a>3\.32 PHR\_Profile – Link ABHA number via Mobile\-Verify OTP

This API is used to verify the OTP in order to link an ABHA number with an ABHA address\. 

__URL:__ /abha/api/v3/phr/app/login/profile/verify

__Request:__ POST

__Header Parameters: __

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time\.__

Authorization

\{\{access\-token\}\}

Yes

__Authentication token for user__

__Body Parameters: __

Property Name

Example Value

Required

Description

scope

               "abha\-login",

        "mobile\-verify"

 

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

  

\{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body: __

Request Body:

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

__Response Body__: The table below illustrates the response body

Response

Code : 200 OK   
  
\{

    "txnId": "d9bd3f91\-e615\-4bd9\-a6b5\-f18f00ad1b8",

    "message": "OTP Verified Successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "johndoe@abdm",

            "fullName": "John Doe",

            "abhaNumber": "xx\-xxxx\-xxxx\-1234",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \},

        \{

            "abhaAddress": "john\.doe@abdm",

            "fullName": "John Doe",

            "abhaNumber": "xx\-xxxx\-xxxx\-1234",

            "status": "ACTIVE",

            "kycStatus": "PENDING"

        \}

    \],

    "accounts": \[

        \{

            "mobile": "XXXXXX1234",

            "firstName": "John",

            "middleName": "",

            "lastName": "Doe",

            "name": "John Doe",

            "yearOfBirth": "1998",

            "dayOfBirth": "14",

            "monthOfBirth": "11",

            "gender": "M",

            "email": __null__,

            "profilePhoto": "\{\{base\-64\-encoded\-profile\-photo\}\}",

            "status": "ACTIVE",

            "stateCode": "27",

            "districtCode": "487",

            "subDistrictCode": __null__,

            "villageCode": __null__,

            "townCode": __null__,

            "wardCode": __null__,

            "pincode": "422003",

            "address": "street number 4, sector 12",

            "kycPhoto": "\{\{base\-64\-encoded\-kyc\-photo\}\}",

            "stateName": "MAHARASHTRA",

            "districtName": "NASHIK",

            "subdistrictName": "NASHIK",

            "villageName": __null__,

            "townName": "Nashik",

            "wardName": __null__,

            "authMethods": \[

                "DEMOGRAPHICS",

                "MOBILE\_OTP",

                "AADHAAR\_OTP",

                "AADHAAR\_BIO"

            \],

            "tags": \{\},

            "kycVerified": __true__,

            "verificationStatus": "VERIFIED",

            "verificationType": "AADHAAR",

            "emailVerified": __null__,

            "ABHANumber": "xx\-xxxx\-xxxx\-1234",

            "preferredAbhaAddress": "john\.doe@abdm"

        \}

    \],

    "tokens": \{

        "token": "\{\{JWT\-X\-Token\}\}",

        "expiresIn": 1800,

        "refreshToken": "\{\{JWT\-R\-Token\}\}",

        "refreshExpiresIn": 1296000

    \}

\}

__Error scenarios:__

Scenarios

Headers/Body

Message

Invalid Link or DeLink transaction id

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{invalid transactionId\}\}*",

            "otpValue": "*\{\{encryptedData\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code :\- 400 Bad Request

When Link or De Link invalid otp

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\{

    "txnId": "68989cca0\-6ee6\-4cde\-ae23\-7d54958d3d65",

    "message": "Please enter a valid OTP\. Entered OTP is either expired or incorrect\.",

    "authResult": "failed",

    "users": \[\]

\}

Code :\- 200 Ok

When invalid auth methods

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password Request, Please enter valid ABHA Address or valid password"

    \}

\]

Code :\- 400 Bad Request

When invalid scope

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code :\- 400 Bad Request

Link or De\-Link No X\-Token

\{

    "scope": \[

        "abha\-login",

        "mobile\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

Access denied

Code:\- 403 Forbidden

## <a id="_3.31_PHR_Profile_-"></a><a id="_Toc176957941"></a>3\.33 PHR\_Profile – Process Link Request via ABHA number

After verifying the OTP from ABHA user, can proceed with linking of the ABHA Address to ABHA number\.

__URL:__ /abha/api/v3/phr/app/login/profile/link

__Request:__ POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

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

__Body Parameters:__

Property Name

Example Value

Required

Description

action

"LINK"

Yes 

Link or de\-link action to be selected

transactionId 

“12345”

Yes 

Unique id

__Request Body: __

Request Body:

\{

    "action": "LINK",

    "transactionId":"*\{\{ transactionId\}\}*"

\}

__Response Body__: 

Response

Code : 200 OK  
  
\{

    "message": "ABHA number is securely linked to ABHA address",

    "authResult": "success"

\}

__Error scenarios:__

Scenarios               Headers/Body                                                     Message

Invalid transaction id

\{

    "action": "LINK",

    "transactionId":"*\{\{invalid transactionId\}\}*"

\}

\{

    "code": "ABDM\-9999: ",

    "message": "Transaction is not found for UUID\."

\}

Code :\- 400 Bad Request

When Blank transaction id

\{

    "action": "LINK",

    "transactionId":"*\{\{invalid transactionId\}\}*"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code :\- 400 Bad Request

When invalid account Action

\{

    "action": "LINK",

    "transactionId":"*\{\{invalid transactionId\}\}*"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Account Action"

    \}

\] Code :\- 400 Bad Request

When Link Request no X\-Token

\{

    "action": "LINK",

    "transactionId":"*\{\{invalid transactionId\}\}*"

\}

Access Denied

Code:\-403 Forbidden

## <a id="_3.32_PHR_Profile_–"></a><a id="_3.34_PHR_Profile_–"></a><a id="_3.37_PHR_Profile_–"></a><a id="_Toc176957942"></a>3\.34 <a id="_Hlk176781347"></a>PHR\_Profile – <a id="_Hlk176457079"></a>Link ABHA number via AADHAAR\-Request OTP

This API is used to  linking an ABHA number to an ABHA address using the Aadhaar OTP verification\.

__URL:__ /abha/api/v3/phr/app/login/profile/request/otp 

__Request:__ POST

__Header Parameters: __

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time\.__

Authorization

\{\{access\-token\}\}

Yes

__Authentication token for user__

__Body parameters:__ 

Property Name

Example Value

Required

Description

scope

 "abha\-login",

        "aadhaar\-verify"

Yes 

OTP will generate using notification service for the given scope

loginHint

"abha\-number"

Yes 

The registration methods can be provided 

loginId

"\{\{encrypted *abha\-number* \}\}"

Yes

Encrypted login id which can be mobile number

otpSystem

" aadhaar "

Yes

To verify method of otp system

__Request Body: __

Request Body:

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

__Response Body__: 

Response

Code : 200 OK  
  
\{

    "txnId": "d8bd3f01\-e615\-4bd8\-a6b6\-f18f07cad1dd",

    "message": "OTP is sent to Aadhaar registered mobile number ending with \*\*\*\*\*\*\*1234"

\}

<a id="_Hlk176457192"></a>__Error scenarios:__

Scenarios               Headers/Body                                                    Message

When Link or De\-Link no X\-Token

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

Access Denied

Code:\- 403 Forbidden

when  Link – Delink invalid invalid login id

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

\{

    "code": "ABDM\-9999",

    "message": "Invalid LoginId"

\}

Code:\- 400 Bad Request

When invalid otp system

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Otp System"

    \}

\]

Code :\- 400 Bad Request

When invalid login Hint

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Login Hint"

    \}

\]

 Code :\- 400 Bad Request

When Invalid Scope

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "loginHint": "abha\-number",

    "loginId": "*\{\{encrypted invalid abha\-number\}\}*",

    "otpSystem": "aadhaar"

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code :\- 400 Bad Request

## <a id="_3.33_PHR_Profile_-"></a><a id="_3.35_PHR_Profile_-"></a><a id="_Toc176957943"></a>3\.35 PHR\_Profile – Link ABHA number via AADHAAR\-Verify OTP

This API is used to verify the OTP in order to Link ABHA number with ABHA Address\.

__URL:__ /abha/api/v3/phr/app/login/profile/verify

__Request:__ POST

__Header Parameters: __

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time\.__

Authorization

\{\{access\-token\}\}

Yes

__Authentication token for user__

__Body parameters:__ 

Property Name

Example Value

Required

Description

scope

"abha\-login",

        "aadhaar\-verify"

 

Yes 

Used to call ABHA profile service to verify OTP for given scope

authData

  

\{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

\}

Yes

This includes authMethods, transaction id and OTP value\.

__Request Body: __

Request Body:

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

<a id="_Hlk176458453"></a>__  
Response Body:__ 

Response:

Code : 200  Ok    
  
\{

    "txnId": "d9bd3f91\-e615\-4bd9\-a6b5\-f18f00ad1b8",

    "message": "OTP Verified Successfully",

    "authResult": "success",

    "users": \[

        \{

            "abhaAddress": "johndoe@sbx",

            "fullName": "John Doe",

            "abhaNumber": "xx\-xxxx\-xxxx\-1234",

            "status": "ACTIVE",

            "kycStatus": "VERIFIED"

        \},

        \{

            "abhaAddress": "john\.doe@sbx",

            "fullName": "John Doe",

            "abhaNumber": "xx\-xxxx\-xxxx\-1234",

            "status": "ACTIVE",

            "kycStatus": "PENDING"

        \}

    \],

    "accounts": \[

        \{

            "mobile": "XXXXXX1234",

            "firstName": "John",

            "middleName": "",

            "lastName": "Doe",

            "name": "John Doe",

            "yearOfBirth": "1998",

            "dayOfBirth": "14",

            "monthOfBirth": "11",

            "gender": "M",

            "email": __null__,

            "profilePhoto": "\{\{base\-64\-encoded\-profile\-photo\}\}",

            "status": "ACTIVE",

            "stateCode": "27",

            "districtCode": "487",

            "subDistrictCode": __null__,

            "villageCode": __null__,

            "townCode": __null__,

            "wardCode": __null__,

            "pincode": "422003",

            "address": "street number 4, sector 12",

            "kycPhoto": "\{\{base\-64\-encoded\-kyc\-photo\}\}",

            "stateName": "MAHARASHTRA",

            "districtName": "NASHIK",

            "subdistrictName": "NASHIK",

            "villageName": __null__,

            "townName": "Nashik",

            "wardName": __null__,

            "authMethods": \[

                "DEMOGRAPHICS",

                "MOBILE\_OTP",

                "AADHAAR\_OTP",

                "AADHAAR\_BIO"

            \],

            "tags": \{\},

            "kycVerified": __true__,

            "verificationStatus": "VERIFIED",

            "verificationType": "AADHAAR",

            "emailVerified": __null__,

            "ABHANumber": "xx\-xxxx\-xxxx\-1234",

            "preferredAbhaAddress": "john\.doe@sbx"

        \}

    \],

    "tokens": \{

            "token": "\{\{JWT\-X\-Token\}\}",

             "expiresIn": 1800,

             "refreshToken": "\{\{JWT\-R\-Token\}\}",

             "refreshExpiresIn": 1296000

\}

__  
Error scenarios:__

Scenarios              Headers/Body                                                   Message

When Link or De\-Link no X \- Token

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

Access Denied

Code:\- 403 Forbidden

When Invalid Link or DeLink transaction id

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

            "txnId": "*\{\{invalid transactionId\}\}*",

            "otpValue": "*\{\{encrypted OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code :\- 400 Bad Request

When Link or De Link invalid otp

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

             "txnId": "\{\{ transactionId\}\}",

            "otpValue": "\{\{encrypted invalid OTP\}\}"

        \}

    \}

\}

\{

    "code": "ABDM\-9999",

    "message": "Invalid OTP Value"

\}

Code :\- 400 Bad Request

When invalid auth methods

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

             "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Auth Methods"

    \},

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Password Request, Please enter valid ABHA Address or valid password"

    \}

\]

Code :\- 400 Bad Request

When invalid scope

\{

    "scope": \[

        "abha\-login",

        "aadhaar\-verify"

    \],

    "authData": \{

        "authMethods": \[

            "otp"

        \],

        "otp": \{

             "txnId": "*\{\{ transactionId\}\}*",

            "otpValue": "*\{\{encrypted invalid OTP\}\}*"

        \}

    \}

\}

\[

    \{

        "code": "ABDM\-1006: ",

        "message": "Invalid Scope"

    \}

\]

Code :\- 400 Bad Request

<a id="_3.34_PHR_Profile_-"></a><a id="_3.36_PHR_Profile_-"></a>## <a id="_Toc176957944"></a>3\.36 <a id="_Hlk176781405"></a>PHR\_Profile \- Process Link Request via AADHAAR Number

After verifying the OTP from Aadhaar, user can proceed with linking the ABHA Address to ABHA number

__URL:__ /abha/api/v3/phr/app/login/profile/link

__Request:__ POST

__Header Parameters:__

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time\.__

Authorization

\{\{access\-token\}\}

Yes

__Authentication token for user__

__Body Parameters:__

<a id="OLE_LINK333"></a><a id="OLE_LINK334"></a><a id="OLE_LINK7"></a>Property Name

Example Value

Required

Description

action

LINK

Yes 

Link or de\-link action to be selected

transactionId

*\{\{ transactionId\}\}*

Yes 

Unique Id

__Request Body__: 

Request Body

\{

    "action": "LINK",

    "transactionId":"*\{\{ transactionId\}\}*"

\}

Response

Code: 200 Ok  
  
\{

    "message": "ABHA number is securely linked to ABHA address",

    "authResult": "success"

\}

__Error Scenarios:__

Scenarios

Headers/Body

Message

Invalid transaction id

\{

    "action": "LINK",

    "transactionId":"*\{\{invalid transactionId\}\}*"

\}

\{

    "code": "ABDM\-9999: ",

    "message": "Transaction is not found for UUID\."

\}

Code :\- 400 Bad Request

When Blank transaction id

\{

    "action": "LINK",

    "transactionId":"*\{\{invalid transactionId\}\}*"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code :\- 400 Bad Request

When invalid account Action

\{

    "action": "LINK",

    "transactionId":"*\{\{invalid transactionId\}\}*"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Account Action"

    \}

\]  
 Code :\- 400 Bad Request

When Link Request no X\-Token

\{

    "action": "LINK",

    "transactionId":"*\{\{invalid transactionId\}\}*"

\}

Access Denied 

Code:\- 403 Forbidden

<a id="_3.35_PHR_Profile-_De-Link"></a><a id="_3.37_PHR_Profile-_De-Link"></a><a id="_3.40_PHR_Profile-_De-Link"></a>

## <a id="_3.41_PHR_Profile_–"></a><a id="_3.43_PHR_Profile_–"></a><a id="_3.40_PHR_Profile_Switch"></a><a id="_3.42_PHR_Profile_Switch"></a><a id="_3.44_PHR_Profile_Switch"></a><a id="_3.47_PHR_Profile_Switch"></a><a id="_3.40_PHR_Profile_Get"></a><a id="_3.37_PHR_Profile_-"></a>3\.37 PHR\_Profile \- Switch Profile Request	

This API will be used to switch between different user profiles \(eKYC and non eKYC\)\. If the user has multiple ABHA addresses, then if the user logs in via ABHA number/mobile number then user can switch between these Abha addresses\.

__NOTE:__

1. If a user logs in using an ABHA Address, they will not be able to switch between different users\.
2. If a user logs in using an ABHA Numbe, AADHAAR Number,or Mobile Number, they can switch between profiles\.

__URL:__ /abha/api/v3/phr/app/login/profile/switch\-profile

__Request:__ GET

__Header Parameters:   
__

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

Yes 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret 

REQUEST\-ID 

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8 

Yes 

Unique UUID for track the end to end request transaction 

TIMESTAMP 

\{\{$isoTimestamp\}\}

Yes 

Actual time when request was initiated, ISO Date time format represents date and time

__Response Body__: 

Response:

Status: 200 ok  
  
\{

    "txnId": "86598c29\-6ac0\-4185\-8a6f\-c32a9a63c84e",

    "users": \[

        

        \{

            "abhaAddress": "rittick\_r\.20@sbx",

            "fullName": "Rittick Mondal",

            "status": "ACTIVE",

            "kycStatus": "PENDING"

        \},

    \],

    "tokens": \{

        "token": ”\{\{encrypted\-T\-token\}\}”,

        "expiresIn": 300,

        "switchProfileEnabled": false

    \}

\}

__Error Scenarios:__

Scenarios

Headers/Body

Message

To verify when No X token is provided

\[

    \{

        "key": " X\-token ",

        "value": "",

        "type": "text"

    \}

\]

Access Denied 

Code : 403 Forbidden 

 

When X\-Auth\-TOKEN is not provided in header\.

\[

    \{

        "key": "X\-AUTH\-TOKEN",

        "value": "",

        "type": "text"

    \}

\]

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code \- 401 Unauthorized

## <a id="_3.41_PHR_Profile_Switch"></a><a id="_3.43_PHR_Profile_Switch"></a><a id="_3.45_PHR_Profile_Switch"></a><a id="_3.48_PHR_Profile_Switch"></a><a id="_3.38_PHR_Profile_-"></a><a id="_Toc176957952"></a>3\.38 PHR\_Profile \- Switch Profile Verify	

This API will be invoked to verify the profile to which user has switched\.

__URL:__ /abha/api/v3/phr/app/login/profile/verify/switch\-profile/user

__Request:__ POST

__Header Parameters:   
__

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\}

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

__Body parameters:__ 

Property Name

Example Value

Required

Description

abhaAddress

john\.doe@sbx

Yes 

The ABHA Address is used for linking health records across multiple systems\.

txnId

*\{\{ transactionId\}\}*

Yes 

Unique Id

__Request Body:__ 

Request Body:

\{

    "abhaAddress":"john\.doe@sbx",

    " txnId ":"\{\{ transactionId\}\}"

\}

__Response Body__: 

Response:

Status: 200 ok  
  
\{

    "token": "\{\{JWT\-X\-Token\}\}",

        "expiresIn": 1800,

        "refreshToken": "\{\{JWT\-R\-Token\}\}",

        "refreshExpiresIn": 1296000

\}

__Error Scenarios:  
__

Scenarios

Headers/Body

Message

Invalid ABHA number

\{

    "abhaAddress":"john\.doe1234@sbx",

    "txnId":"\{\{ transactionId\}\}"

\}

\{

    "code": "ABDM\-9999: ",

    "message": "User not found\."

\}

Code:\- 400 Bad Request

Invalid Transaction id

\{

    "abhaAddress":"john\.doe@sbx",

    "txnId":"\{\{ invalid transactionId\}\}"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Transaction Id"

    \}

\]

Code:\- 400 Bad Request

When No T \- Token

\{

    "abhaAddress":"john\.doe@sbx",

    "txnId":"\{\{ transactionId\}\}"

\}

Access Denied 

Code:\- 403 Forbidden

NOTE: \-   

In case of login via mobile number, the user should be able to see the list of ABHA addresses for both KYC and NON\-KYC users should be display\.

## <a id="_3.42_PHR_Profile_–"></a><a id="_3.44_PHR_Profile_–"></a><a id="_3.46_PHR_Profile_–"></a><a id="_3.49_PHR_Profile_–"></a><a id="_3.39_PHR_Profile_–"></a><a id="_Toc176957953"></a>3\.39 <a id="_Hlk176795922"></a>PHR\_Profile – Get User Profile

This Api is used to fetch user profile for respective user who has logged in based on X\- token provided in the input\.

User profile consists of user details like name, gender, status, kyc status, abhaNumber etc

__URL:__ /abha/api/v3/phr/app/login/profile

__Request:__ GET

__Header Parameters: __

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time__

X\-token

Bearer \{\{X\-token\}\}

Yes

__Bearer token__

X\-AUTH\-TOKEN

\{\{access\-token\}\}

Yes

JWT Authentication token for user

__Response Body__: 

Response

\{

    "abhaAddress": "johndoe@sbx",

    "fullName": "John Doe",

    "firstName": "John",

    "middleName": "",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "dateOfBirth": "14\-11\-1998",

    "gender": "M",

    "email": "johxxxxxxxxxx@gmail\.com",

    "mobile": "XXXXXX1234",

    "abhaNumber": "xx\-xxxx\-xxxx\-1234",

    "address": "street number 4, sector 12",

    "stateName": "Maharashtra",

    "districtName": "Nashik",

    "pinCode": "422003",

    "stateCode": "27",

    "districtCode": "123",

    "authMethods": \[

        "MOBILE\_OTP",

        "PASSWORD",

        "EMAIL\_OTP",

        "AADHAAR\_OTP"

    \],

    "status": "ACTIVE",

    "emailVerified": "true",

    "mobileVerified": "true",

    "kycStatus": "VERIFIED",

    "abhaLinkedCount": "3"

\}

Status code: 200 OK

__Error Scenarios:__

Scenarios

Headers/Body

Message

To verify when No X token is provided

\[

    \{

        "key": " X\-token ",

        "value": "",

        "type": "text"

    \}

\]

Access Denied 

Code : 403 Forbidden 

 

When X\-Auth\-TOKEN is not provided in header\.

\[

    \{

        "key": "X\-AUTH\-TOKEN",

        "value": "",

        "type": "text"

    \}

\]

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code \- 401 Unauthorized

## <a id="_3.43_PHR_Profile_-"></a><a id="_3.44_PHR_Profile_-"></a><a id="_3.40_PHR_Profile_-"></a><a id="_Toc176957954"></a>3\.40 PHR\_Profile \- Get User QR Code

This API is used to fetch a QR code for the respective logged\-in user\. This QR code can be scanned to get the user's details, such as name, gender, address, etc\.

__URL:__ /abha/api/v3/phr/app/login/profile/qrCode

__Request:__ GET

__Header Parameters: __

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time__

X\-token

Bearer \{\{X\-token\}\}

Yes

__Bearer token__

X\-AUTH\-TOKEN

\{\{access\-token\}\}

Yes

JWT Authentication token for user

__Response Body__: 

Response

__QR Code__

__Status code: __202 Accepted

__Error Scenarios:__

Scenarios

Headers/Body

Message

To verify when No X token is provided

\[

    \{

        "key": " X\-token ",

        "value": "",

        "type": "text"

    \}

\]

Access Denied 

Code : 403 Forbidden 

 

When X\-Auth\-TOKEN is not provided in header\.

\[

    \{

        "key": "X\-AUTH\-TOKEN",

        "value": "",

        "type": "text"

    \}

\]

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code \- 401 Unauthorized

## <a id="_3.44_PHR_Profile_-Get"></a><a id="_3.46_PHR_Profile_-Get"></a><a id="_3.48_PHR_Profile_-Get"></a><a id="_3.51_PHR_Profile_-Get"></a><a id="_3.45_PHR_Profile_-Get"></a><a id="_3.41_PHR_Profile_-"></a><a id="_Toc176957955"></a>3\.41 PHR\_Profile \- Get User PHR Card

This Api is used to fetch the PHR Card for respective logged in user\.

PHR card will display \(eKYC/non\-eKYC\) user details\.

__Note: __To generate the PHR card, the ABHA address is a mandatory field, but the ABHA number is optional\. However, for the ABHA card, both the ABHA number and ABHA address are mandatory\.

__ 	__

__URL:__  /abha/api/v3/phr/app/login/profile/phrCard__ __

__Request:__ GET

__Header Parameters: __

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time__

X\-token

"Bearer \{\{X\-token\}\}"

Yes

Suffix of the consent manager to which the request was intended

X\-AUTH\-TOKEN

\{\{access\-token\}\}

Yes

JWT Authentication token for user

__Response Body__: 

Response

PHR Card

202 Accepted

__Error Scenarios:__

Scenarios

Headers/Body

Message

To verify when No X token is provided

\[

    \{

        "key": " X\-token ",

        "value": "",

        "type": "text"

    \}

\]

Access Denied 

Code : 403 Forbidden 

 

When X\-Auth\-TOKEN is not provided in header\.

\[

    \{

        "key": "X\-AUTH\-TOKEN",

        "value": "",

        "type": "text"

    \}

\]

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code \- 401 Unauthorized

## <a id="_3.45_PHR_Profile_-"></a><a id="_3.46_PHR_Profile_-"></a><a id="_Toc176957956"></a>3\.42 PHR\_Profile – Update User Profile

This API is used to update the profile for the respective logged\-in user\.

__Note:__ In the case of an e\-KYC user, KYC details such as name, DOB, and gender will not be updated\. However, for a non\-e\-KYC user, all details will be updated\.

\{

    "profilePhoto": "",

    "firstName": "",

    "middleName": "",

    "lastName": "",

    "dayOfBirth": "",

    "monthOfBirth": "",

    "yearOfBirth": "",

    "gender": "",

    "address": "",

    "stateName": "",

    "districtName": ",

    "pinCode": ",

    "stateCode": ",

    "districtCode": ""

\}

__URL:__ /abha/api/v3/phr/app/login/profile/updateProfile

__Request:__ POST

__Header Parameters: __

Property Name

Example Value

Required

Description

Authorization 

\{\{access\-token\}\} 

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

__  
Body parameters:__ 

<a id="OLE_LINK388"></a><a id="OLE_LINK389"></a>Property Name

Example Value

Required

Description

Profile Photo

“”

Yes

Profile photo of user

First Name

John

Yes

First name of user

Middle Name

“”

Yes

Middle Name of user

Last Name

Doe

Yes

Last Name of user

Day of Birth

15

Yes

Date of Birth of user

Month of Birth

2

Yes

Month of Birth of user

Year of Birth

1996

Yes

Year of Birth of user

Gender

M

Yes

Gender of user

Email

[john@gmail\.com](mailto:john@gmail.com) or “”

Yes

Email of user

Mobile

XXXXXX1234

Yes

Mobile number of users

Address

"street number 5"

Yes

Address of user

State Name

"Maharashtra"

Yes

State Name of user

District Name

“Nashik”

Yes

District Name of user

Pin Code

422003

Yes

Pin Code of user

State Code

27

Yes

State Code of user

District Code

123

Yes

District Code of user

__Request Body:__ 

Request Body:

\{

    "profilePhoto": "",

    "firstName": "John",

    "middleName": "",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "gender": "M",

    "email": "",

    "mobile": "XXXXXX1234",

    "address": "street number 5",

    "stateName": "Maharashtra",

    "districtName": "Nashik",

    "pinCode": "422003",

    "stateCode": "27",

    "districtCode": "123"

\}

__Response Body__: 

Response

Status: 200 ok  
  
\{

    "abhaAddress": "johndoe@sbx",

    "fullName": "John Doe",

    "firstName": "John",

    "middleName": "",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "dateOfBirth": "14\-11\-1998",

    "gender": "M",

    "email": "johxxxxxxxxxx@gmail\.com",

    "mobile": "XXXXXX1234",

    "abhaNumber": "xx\-xxxx\-xxxx\-1234",

    "address": "street number 5",

    "stateName": "Maharashtra",

    "districtName": "Nashik",

    "pinCode": "422003",

    "stateCode": "27",

    "districtCode": "123",

    "authMethods": \[

        "MOBILE\_OTP",

        "PASSWORD",

        "EMAIL\_OTP",

        "AADHAAR\_OTP"

    \],

    "status": "ACTIVE",

    "emailVerified": "true",

    "mobileVerified": "true",

    "kycStatus": "VERIFIED",

    "abhaLinkedCount": "3"

\}

__Error Scenarios:__

Scenarios

Headers/Body

Message

Invalid First Name

\{

    "profilePhoto": "",

    "firstName": "",

    "middleName": "",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "gender": "M",

    "email": "",

    "mobile": "XXXXXX1234",

    "address": "street number 5",

    "stateName": "Maharashtra",

    "districtName": "Nashik",

    "pinCode": "422003",

    "stateCode": "27",

    "districtCode": "123"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid First Name"

    \}

\]

Code:\- 400 Bad Request

When invalid Date of Birth

\{

    "profilePhoto": "",

    "firstName": "John",

    "middleName": "",

    "lastName": "Doe",

    "dayOfBirth": "33",

    "monthOfBirth": "13",

    "yearOfBirth": "2028",

    "gender": "M",

    "email": "",

    "mobile": "XXXXXX1234",

    "address": "street number 5",

    "stateName": "Maharashtra",

    "districtName": "Nashik",

    "pinCode": "422003",

    "stateCode": "27",

    "districtCode": "123"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Day Of Birth"

    \},

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Month Of Birth"

    \},

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid Year Of Birth"

    \}

\]

Code:\- 400 Bad Request

When Blank District and State

\{

    "profilePhoto": "",

    "firstName": "John",

    "middleName": "",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "gender": "M",

    "email": "",

    "mobile": "XXXXXX1234",

    "address": "street number 5",

    "stateName": "",

    "districtName": "",

    "pinCode": "420003",

    "stateCode": "27",

    "districtCode": "123"

\}

\[

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid State, it must be only Alphabets"

    \},

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid District"

    \},

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid State"

    \},

    \{

        "code": "ABDM\-9999: ",

        "message": "Invalid District, it must be only Alphabets"

    \}

\]

Code:\- 400 Bad Request

When No X\-Token

\{

    "profilePhoto": "",

    "firstName": "John",

    "middleName": "",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "gender": "M",

    "email": "",

    "mobile": "XXXXXX1234",

    "address": "street number 5",

    "stateName": "Maharashtra",

    "districtName": "Nashik",

    "pinCode": "422003",

    "stateCode": "27",

    "districtCode": "123"

\}

Access Denied 

Code:\- 403 Forbidden

When No Auth

\{

    "profilePhoto": "",

    "firstName": "John",

    "middleName": "",

    "lastName": "Doe",

    "dayOfBirth": "14",

    "monthOfBirth": "11",

    "yearOfBirth": "1998",

    "gender": "M",

    "email": "",

    "mobile": "XXXXXX1234",

    "address": "street number 5",

    "stateName": "Maharashtra",

    "districtName": "Nashik",

    "pinCode": "422003",

    "stateCode": "27",

    "districtCode": "123"

\}

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}  

Code:\- 401 Unauthorized

## <a id="_3.48_PHR_Profile_-"></a><a id="_3.53_PHR_Profile_-"></a><a id="_Toc176957957"></a>3\.43 <a id="_Hlk176796036"></a>PHR\_Profile – Generate Refresh Token

This API will generate a refresh token when the user provides the R token fetched after login\. The refresh token remains valid for 15 days\.

__URL:__ /abha/api/v3/phr/app/login/profile/request/token

__Request:__ GET

__Header Parameters: __

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time__

R\-token

Bearer \{\{R\-token\}\}

Yes

Bearer token

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

3fa85f64\-5717\-4562\-b3fc\-2c963f66afa6

Yes

The consent artefact id

error

"error": \{

    "code": "ABDM\-1001",

    "message": "unable to connect database"

  \}

No

The error code and message if any happened\.

requestId 

3fa85f64\-5717\-4562\-b3fc\-2c963f66afa6

Yes

The request id from the /consent/hip/notify

__Response:__ 

Response:

\{

    "tokens": \{

"token": "\{\{JWT\-X\-Token\}\}",

       "expiresIn": 1800,

       "refreshToken": "\{\{JWT\-R\-Token\}\}",

       "refreshExpiresIn": 1296000

\}

__Response Code__: 

Response:

Status: 200 OK  
  
\{

    "tokens": \{

        "token": "\{\{JWT\-X\-Token\}\}",

       "expiresIn": 1800,

       "refreshToken": "\{\{JWT\-R\-Token\}\}",

       "refreshExpiresIn": 1296000

\}

__Error Scenarios:__

Scenarios

Headers/Body

Message

To verify when No R token is not passed 

\[

    \{

        "key": "X\-Token",

        "value": "",    \}

\]

Access Denied 

Code: 403 Forbidden 

 

To verify when NO \-AUTH is provided 

\[

    \{

        "key": "AUTH",

        "value": " ",    \}

\]

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code \- 401 Unauthorized

 

  

## <a id="_3.47_PHR_Profile_-"></a><a id="_3.49_PHR_Profile_-"></a><a id="_3.51_PHR_Profile_-"></a><a id="_3.54_PHR_Profile_-"></a>3\.44 PHR\_Profile – GET Certificate \(Public key\)

This API will return the certificate \(public\-key\) along with the encryption algorithm\.

__URL:__ /abha/api/v3/phr/app/login/public/certificate

__Request:__ GET

__Header Parameters: __

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

\{\{$isoTimestamp\}\}

Yes

__Actual time when request was initiated, ISO Date time format represents date and time__

__Response Body__: 

Response

Code: 200 OK

\{

    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7Zq7YKcjmccSBnR9CDHd6IX96V7D/a2XSMs\+yCgejSe956mqjA/0Q9h\+Xnx7ZZdwe2Tf2Jq/mWXa\+gYdnta58otreXg/5oGnNV3Edlixz1Oc8tJg5bG4sIUCGZcbEQGSbm1iC\+Fp1kS\+YLVG4Su8KoRxcCvRJI2QkfqAruX3JoFjggOkv0TgWCo9z6NV6PPmPN3UsXyH3OPDi3Ewnvd64ngCUKPSBiIDwhLj2yYSShcxH8aWbrz00SJodBJzqgjvCfZuljBXXIN4Ngi/nzqEJ7woKQ1kNgWoHFZy7YL74PihW//4OlniSRoITX\+7ChILIv2ezSmAdIjpNJ9Dg9XKcQIDAQAB",

    "encryptionAlgorithm": "RSA/ECB/OAEPWithSHA\-1AndMGF1Padding"

\}

__Error Scenarios:__

Scenarios

Headers/Body

Message

When APIKEY is Invalid in Authorization\.

\[

    \{

        "key": "apikey",

        "value": "",    \}

\]

\{

    "code": "900901",

    "message": "Invalid Credentials",

    "description": "Invalid Credentials\. Make sure you have provided the correct security credentials"

\}

 

When URL is wrong 

\[

    \{

        "requestid": "3fa85f64\-5717\-4562\-b3fc\-2c963f66afa6",

        "timestamp": "\{\{$isoTimestamp\}\} "

    \}

\]

\{

    "code": "404",

    "type": "Status report",

    "message": "Runtime Error",

    "description": "No matching resource found for given API Request"

\}

Code \- 404 Not Found

## <a id="_3.50_PHR_Profile_-"></a><a id="_3.52_PHR_Profile_-"></a><a id="_3.55_PHR_Profile_-"></a><a id="_3.45_PHR_Profile_–"></a><a id="_Toc176957958"></a>3\.45 <a id="_Hlk176796072"></a>PHR\_Profile – Logout User

This Api is used to logout user from their current user login session\.

__URL:__  /abha/api/v3/phr/app/login/profile/request/logout

__Request:__ GET

__Header Parameters: __

__Property Name__

__Example Value__

__Required__

__Description__

REQUEST\-ID

18235d89\-cb13\-479d\-ad71\-7a57d5f669a8

Yes

__Unique UUID for track the end to end request transaction__

TIMESTAMP

2022\-10\-06T10:10:00\.587Z

Yes

__Actual time when request was initiated, ISO Date time format represents date and time__

X\-token

\{\{access\-token\}\}

Yes

JWT Authentication token for user

__Response Body__: 

Response

Code: 200 OK

\{

    "message": "You have been logged out",

    "timestamp": "2023\-07\-27 13:36:28"

\}

__Error Scenarios:__

Scenarios

Headers/Body

Message

To verify when no X token is provided

\[

    \{

        "key": "X\-Token",

        "value": "",    \}

\]

Access Denied 

Code : 403 Forbidden 

 

When X\-Auth\-TOKEN is Invalid in header\.

\[

    \{

        "key": "X\-AUTH\-TOKEN",

        "value": "hghhjjkhjkbkjbjkbkjbnkjbk",

        "type": "text"

    \}

\]

\{

    "code": "900902",

    "message": "Missing Credentials",

    "description": "Invalid Credentials\. Make sure your API invocation call has a header: 'Authorization : Bearer ACCESS\_TOKEN' or 'Authorization : Basic ACCESS\_TOKEN' or 'apikey: API\_KEY'"

\}

Code \- 401 Unauthorized

# 4 Gateway  

## <a id="_4.1_Overview"></a><a id="_Toc116698"></a>4\.1 Overview  

This is the key ABDM building block that manages ABHA addresses, maintains links to health data for each ABHA address and manages consents provided by the user for sharing of their health data\. It also supports exchange of interoperable health data between HIPs and HIUs\. The HIE\-CM enables exchange of personal health data with consent as per the Health Data Management Policy issued by NHA\.   

## <a id="_3.2_List_of"></a><a id="_Toc116699"></a>4\.2 List of APIs  

### 4\.2\.1 Auth token API  	  	  	  	  	  	  	  

This API will be invoked to generate auth token\.  

__URL:__ api/hiecm/gateway/v3/session\.  

__Request:__ POST  

__ __ 

__ __ 

__ __ __ __ 

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

Unique UUID for tracking the end\-toend request transaction   

TIMESTAMP   

2022\-10\-06T10:10:00\.587Z   

Yes   

The actual time when the request was initiated, ISO Date time format represents the date and time  

X\-CM\-ID   

Sbx  

Yes   

Suffix of the consent manager to which the request was intended\.  

__Body Parameters:__  

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

    "clientSecret": "XXXX\-XXX\-XXXX\-XXXX\-XXXXXXX",      "grantType": "client\_credentials"  

\}  

__ __ 

__ __ 

__ __ 

__ __ 

__ __ 

__Response: __ 

__Response __ 

Code : 202 Accepted   

\{  

    "accessToken":  

"\{\{accessToken\}\}”

",  

    "expiresIn": 1200,  

    "refreshExpiresIn": 1800,  

    "refreshToken":  "\{\{JWT\-R\-Token\}\}", 

    "tokenType": "bearer"  

\}  

__ __ 

__ __ 

### <a id="_4.2.2__OpenID"></a><a id="_Toc116700"></a>4\.2\.2 	OpenID Configuration API

###      

### Openid\-configuration API, defined within OpenID Connect which provides configuration information about the Identity Provider \(IDP\)\.  

__URL:__ /api/hiecm/gateway/v3/well\-known/openid\-configuration

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

Unique UUID for tracking the end\-toend request transaction   

TIMESTAMP   

2022\-10\-06T10:10:00\.587Z   

Yes   

The actual time when the request was initiated, ISO Date time format represents the date and time  

X\-CM\-ID   

Sbx  

Yes   

Suffix of the consent manager to which the request was intended\.  

Property Name  

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

X\-CM\-ID   

Sbx  

Yes   

Suffix of the consent manager to which the request was intended\.  

  

__ __ 

__Response: __ 

Response  

Code : 202 OK  

\{  

    "jwks\_uri": "https://dev\.abdm\.gov\.in/api/hiecm/gateway/v3/certs"  

\}  

__ __ 

  

### <a id="_4.2.3__Keycloak"></a>4\.2\.3 	Keycloak Certificate API   

### 	  	  	  	  	  	  

In response to open ID configuration API,[ Keycloak, ](https://www.keycloak.org/)the open\-source identity provider, provides an OAuth certificate that can be used with open source authentication requests for certificates\.  

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

Unique UUID for tracking the end\-toend request transaction   

TIMESTAMP   

2022\-10\-06T10:10:00\.587Z   

Yes   

The actual time when the request was initiated, ISO Date time format represents the date and time  

X\-CM\-ID   

Sbx  

Yes   

Suffix of the consent manager to which the request was intended\.  

__ __ 

__Response:__

 

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

3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJoJlu1uWRhfxuXCXr8GIvB4j3CPuqkv6b J2cWuL925MAJMjqDnfPupHraziPmQNj20Wxp8RX2R4iPeK3RVyeEPWpqbHLM/TaHEyDzD5lsnSfAOdKWW mFsopGA0iYg5bau4t1rKTykjrkB6wuYfXTHAlb3l\+aHoNLTuvGe/YMA5aXMYqg2xWqYbKg78fuV5H8Iqrzg WsmyuvwQgT7k6ljFBLlJJS2F7tl\+xEh3VTRTBQI8QnAl1LT\+yxXb0955xXpEZhvNkG0kElXuDebTx/KtDAsUllp9 

 

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

3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJoJlu1uWRhfxuXCXr8GIvB4j3CPuqkv6b J2cWuL925MAJMjqDnfPupHraziPmQNj20Wxp8RX2R4iPeK3RVyeEPWpqbHLM/TaHEyDzD5lsnSfAOdKWW mFsopGA0iYg5bau4t1rKTykjrkB6wuYfXTHAlb3l\+aHoNLTuvGe/YMA5aXMYqg2xWqYbKg78fuV5H8Iqrzg WsmyuvwQgT7k6ljFBLlJJS2F7tl\+xEh3VTRTBQI8QnAl1LT\+yxXb0955xXpEZhvNkG0kElXuDebTx/KtDAsUllp9 

nNeWw58zhfnb30QlT0Wmws8NDPrrR0fXYk61rauiqIuW7sYMDNa25NKfECAwEAATANBgkqhkiG9w0BAQs FAAOCAQEACkC3TijrXIgi4vn\+l1uL1nfdK6vOIL5UZ6yCjSOq7zYW6b3Qe8j7NrPb9RJC\+pbIERyNbB\+t9hsa5 g1L7lkjCNlUuxfJprsJ9LJKlM5g7dYEA6XPCJ7C6AVlarj72vlWXQvwjnQMO2/CM9/Jp5Hnv2Qwjn7NME2OW M0iblc/TD\+DEZK5L5mlWMyuBSQo2o/AcOmfG4MoE5Gm/CaOJ47rSrf\+lq83e5\+dyKh7uLVAa\+5WK8Im 

5nEs6BLSGyo2KlaV0mW9yCkoRLLbipjH8\+rJwkUU6iu7QVjz0peGZzYldya5n35gMWH7Bu4HqFneKNRww D6w8rGNC\+uWtgWejDZ3yQ=="  

            \],  

            "x5t": "EaMhYGUIvMkp8tvSM3QoaqaF8xM",  

            "x5t2": "vGer6Pt8AhZn8RlbHhAFksOCcGf3u1UWU7Qq\-Doy7ro",  

            "alg": "RS256"  

        \},  

        \{  

            "e": "AQAB",  

            "kid": "oc\-l6O1yJ7wJKYEeyeUafsz3Aecq7YnCIqbzbIfkJk8",  

            "kty": "RSA",  

            "n":  

"jDOehgMzurNQT0WJCTWN6a34639uIKOLO1LnXZes\_kTakWh6iRxmkExLLCD7MJjz9aijTHwIuKAtOCSbFO pwbqSfF6dMBS2c8cv

0AU3pE8kSMpGJKDZ9diA\-BuUriwr9BUYSUW8SM68QH\_HCaz2mmN\_Z8ynTQ4kWw\_Idj\- enVpkHYtq00DriG98l6RXF1Ao9Kd16ctoNbthuQYH0RSRIXnt0Qtm4GSAY7abPCNa64mir0auldU72DJHXwDo6g5OGz6

EMm86ZAV\_pvh\_5YzFpfkUA8TK2LFVAmC3Up\- IMxv0yMMKFZjkFGA0QKYMkMTC5ruLaE7cec\-njA7dJQnQ",  

            "use": "sig",  

            "x5c": \[  

                 

"MIICrzCCAZcCBgGHxvQVmDANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBjZW50cmFsLXJlZ2lzdHJ 

5MB4XDTIzMDQyODA4MTk1N1oXDTMzMDQyODA4MjEzN1owGzEZMBcGA1UEAwwQY2VudHJhbC1yZWdpc 

3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIwznoYDM7qzUE9FiQk1jemt\+Ot/biCjiztS 

512XrP5E2pFoeokcZpBMSywg\+zCY8/Woo0x8CLigLTgkmxTqcG6knxenTAUtnPHL9AFN6RPJEjKRiSg2fXYg PgblK4sK/QVGElFvPkjOvEB/xwms9ppjf2fMp00OJFsPyHY/np1aZB2LatNA64hvfJekVxdQKPSndenLaDW7Y bkGB9EUkSF57dELZuBkgGO2mzwjWuuJoq9PmrpXVPu9gyR18A6OoOThs\+hDJvOmQFf6b4f\+WMxaX5FA PEytixVQJgt1KfiDMb9MjDChWY5BRgNECmDJDEwua7i2hO3HnPp4wO3SUJ0CAwEAATANBgkqhkiG9w0B 

AQsFAAOCAQEABYAcXOSr\+WgOxKVmygID9WjB4rDuAVDyU3GmjBvckdWhYJuBX8Vs04hNVNgf904gqy 

\+D5wZIQU985stK3PdogFGN2jVw2kO9G3hG4/7uwYKqciKApT/pSPMeHRltHGp/Mwr6e5poVwgQyrn\+Be 

H373U1Q6eB1QUYnElP\+16y7bbvQhfDAS2X9sqdfurB9YIL5xZMPddZaf7pPX8oWOVlB0XH1JEZfsX125qq0Xn K8z/Rd8KI8zTfJw6D2Kzrk1WvQSlM5KnTQmcSk3kwDlW5Dg657dT49Y68mI4azq34q17JgBhTx3IbTuf94QT w7QC5wmFtO\+hc6zPVODX8JWu7sQ=="  

\],

“x5t": "\-HZ\-fkkNBhTsPHWrhATwlZflhdU”

\}\]

### <a id="_4.2.4__Update"></a>4\.2\.4__ 	__Update bridge URL API__   __

This API is designed to update the URL of a bridge\. When invoked, it allows users to modify the existing URL associated with a specific bridge\. This functionality is crucial for maintaining accurate and up\-to\-date connection information within the network\.

__URL:__ /api/hiecm/gateway/v3/bridge/url 

__Request:__ PATCH 

__Header Parameters:__  

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

__Body Parameters: __ 

Property Name  

Example Value  

 

Required  

Description  

url  

[https://webhook\.site/b7 ](https://webhook.site/b799c0b8-4e75-4545-8eb2-d8c2d5f0c9f6)

[99c0b8\-4e75\-4545\- 8eb2\-d8c2d5f0c9f6  ](https://webhook.site/b799c0b8-4e75-4545-8eb2-d8c2d5f0c9f6)

[Ye](https://webhook.site/b799c0b8-4e75-4545-8eb2-d8c2d5f0c9f6)s  	 

Bridge base URL  

__Request Body: __ 

Request Body  

\{  

    "url": "[https://webhook\.site/b799c0b8\-4e75\-4545\-8eb2\-d8c2d5f0c9f6"  ](https://webhook.site/b799c0b8-4e75-4545-8eb2-d8c2d5f0c9f6)

\}  

__ __  

__Response: __ 

__ __ 

Response  

Code : 202 Accepted  

  

### <a id="_4.2.5__Registration"></a>4\.2\.5 	Registration of Facility & Software Linkage  

  

__Overview:__ The software being used by the provider must integrate with the digital building blocks of ABDM and comply with the guidelines outlined NHA\. NHA maintains the national directory of all healthcare facilities\. Any participating facility needs to sign up in the health facility registry at \(nhpr\.abdm\.gov\.in\) This ensures that they are a valid facility which is authorized to issue health records in the ecosystem\. HFR consists of information for each healthcare facility in the country – hospitals, clinics, diagnostic centers, pharmacies etc\., across all systems of medicine and covering both public and private health facilities\. HFR offers APIs that can be used by various stakeholders in the ecosystem\. Healthcare information service provider application or healthcare repository provider application must be upgraded to become ABDM compliant\.

__Registration of facility:__

__Through website__:[ https://hspsbx\.abdm\.gov\.in/home ](https://hspsbx.abdm.gov.in/home)\(sandbox\) , [https://nhpr\.abdm\.gov\.in/home ](https://nhpr.abdm.gov.in/home)\(production\)[  __S__](https://nhpr.abdm.gov.in/home)__tep\-by\-step user manual document access:__

Goto: [https://hspsbx\.abdm\.gov\.in/home ](https://hspsbx.abdm.gov.in/home)\(sandbox\) , [https://nhpr\.abdm\.gov\.in/home ](https://nhpr.abdm.gov.in/home)\(production\)[  ](https://nhpr.abdm.gov.in/home)>>Resource center >> User Manual

>> Select “For Health Fecility” >>Download “User Manual” >>Refer Content

“A” \(Health Professional ID \(HPID\) creation\), “B” \(Facility Registration\) __Registration of bridge services \(HIP/HIU\) on facility:__

__Option 1__: Linking through website: [https://hspsbx\.abdm\.gov\.in/home ](https://hspsbx.abdm.gov.in/home)\(sandbox\) , [https://nhpr\.abdm\.gov\.in/home ](https://nhpr.abdm.gov.in/home)\(production\)[  __S__](https://nhpr.abdm.gov.in/home)__tep\-by\-step user manual document access:__

Goto: [https://hspsbx\.abdm\.gov\.in/home ](https://hspsbx.abdm.gov.in/home)\(sandbox\) , [https://nhpr\.abdm\.gov\.in/home ](https://nhpr.abdm.gov.in/home)\(production\)[   ](https://nhpr.abdm.gov.in/home)>>Resource center >> User Manual >> Select “For Health Facility” >>Download “User Manual” >>Refer Content “C” \(Software Linkage\)\.

__Option 2: Through API __ This API \(  https://facilitysbx\.abdm\.gov\.in[/v1/bridges/MutipleHRPAddUpdateServi ces \)](https://facilitysbx.abdm.gov.in/swagger-ui.html#/operations/Multiple%20HRP%20API/v1MutipleHRPAddUpdateServicesUsingPOST) will be used to link multiple bridges against a facility\. It will accept the facility id , facility name and list of HRP i\.e\. bridges\.

Please note:

- You must pass in all the required parameters to create the API\.
- The data needs to be passed in the required format as mentioned for each field\.    __API can refer swagger link :__

[https://facilitysbx\.abdm\.gov\.in/swaggerui\.html\#/Multiple\_HRP\_API >](https://facilitysbx.abdm.gov.in/swagger-ui.html#/Multiple_HRP_API)>>Go to Multi HRP API >>>and Select

[“/v1/bridges/MutipleHRPAddUpdateServices v](https://facilitysbx.abdm.gov.in/swagger-ui.html#/operations/Multiple%20HRP%20API/v1MutipleHRPAddUpdateServicesUsingPOST)1MutipleHRPAddUpdateServices”

__Parameters:   __

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

Alphanumeric and validity to be checked by HIECM 

__hipName__    

Yes   

• To provide uniqueness against each bridges that is linked  \. HIP

name is the 

 String    

      	   

    

• HIP name can be the Hospital name added  

 

 

name  	of  	the  	hospital which will reflect  

  

with 	suffix 	of bridge name\.  

example   

  

  

on ABHA/PHR app when the patent will search respective hospital\.   

   

for 

the

     

 

Hospital  

name=XYZ and  bridge name =BRIDGE TEST, so the HIP name = XYZ  BRIDGE\.   

• HIP name can not be more  

than  	15 characters\., No special  

character  	is allowed 

\(%$\*\#@\(~&\!\), and it should be unique for every  	bridge 

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

   

### <a id="_4.2.6__Find"></a>4\.2\.6__ 	__Find Service by service id  

This API is designed to retrieve the details associated with a specific service ID\. When invoked, it queries the system to fetch comprehensive information about the service identified by the provided service ID\.  

__URL:__ /api/hiecm/gateway/v3/bridge\-service/serviceId/\{serviceId\}  

__Request:__ GET  

__ __ 

__Header Parameters:__  

Property Name  

Example Value  

 

Required  

Description  

Authorization   

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac 

2J4IiwiY2xpZW50SWQiOi JzYngiLCJzeXN0ZW0iOiJ 

BQkhBLUEiLCJyZXF1ZXN0Z 

XJJZCI6IlBIUi1XRUIiLCJwa HJNb2JpbGUiOm51bGws 

ImV4cCI6MTY2NzI5ODEx 

NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0  

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

    "isHip": __true__,     

   

   "isHiu": __true__,  

 

   "isPhr": __false__,  

    "endpoints": \{\},  

   "active": __true__,

  

   "registerTime": "2021\-03\-01 11:17:35\.1735",  

   "dateCreated": "2021\-03\-01 11:17:35\.1735",

  

   "dateModified": "2024\-04\-22 11:04:46\.446" 

\}  

  

### <a id="_4.2.7__Find"></a>__4\.2\.7 	__Find services by bridge id__  __

This API is designed to retrieve the unique identifiers, known as service IDs, that are associated with a specific bridge\. In this context, a bridge acts as an intermediary component that connects various services or networks, enabling them to communicate with each other\.  

__URL:__ /api/hiecm/gateway/v3/bridge\-services 

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

                       "address": "[https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/registration"](https://events.hookdeck.com/e/src_3gsnEgI941mh/registration%22) 

 

 

                   \},  

                   \{  

                        "use": "data\-upload",  

                        "connectionType": "HTTPS",  

                        "address": "[https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/data\-upload"](https://events.hookdeck.com/e/src_3gsnEgI941mh/data-upload%22) 

                   \}  

               \],  

                "hiuEndpoints": \[  

                   \{  

                        "use": "registration",  

                        "connectionType": "HTTPS",  

                        "address": "[https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/registration"](https://events.hookdeck.com/e/src_3gsnEgI941mh/registration%22) 

                   \},  

                   \{  

                        "use": "data\-upload",  

                        "connectionType": "HTTPS",  

                        "address": "[https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/data\-upload"](https://events.hookdeck.com/e/src_3gsnEgI941mh/data-upload%22) 

                   \}  

               \],  

               "healthLockerEndpoints": \[  

                   \{  

                        "use": "registration",  

                        "connectionType": "HTTPS",  

                        "address": "[https://events\.hookdeck\.com/e/src\_3gsnEgI941mh/registration"](https://events.hookdeck.com/e/src_3gsnEgI941mh/registration%22) 

                   \},  

 

<a id="_4.2.8__Certificate"></a>### [4\.2\.8](#_4.2.8__Certificate)__[ 	](#_4.2.8__Certificate)__[Certificate API](#_4.2.8__Certificate)__ __

This API is used to retrieve certificate information\. When invoked, it provides details about the certificates used within the system\. These certificates are crucial for ensuring secure communication and authentication between different components of the system\. By using this API, users can access the necessary certificate information required for validating secure connections and maintaining the integrity of data exchanges\.   

__URL:__ /api/hiecm/gateway/v3/certs

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

Code: 200 Ok  

\{

  "keys": \[

    \{

      "e": "AQAB",

      "kid": "AlRb5WCm8Tm9EJ\_IfO9z06j9oCv51pKK",

      "kty": "RSA",

      "n": "mgmW7W5ZGF\_G5cJevwYi8HiPcI\-6qS\_psnZxa4v3bkwAkyOoOd8\-6ketrOI\-ZA2PbRbGnxFfZHiI94rdFXJ4Q9ampscsz9NocTIPMPmWydJ8A50pZaYWyikYDSJiDltq7i3WspPKSOuQHr",

      "use": "sig",

      "x5c": \[

        "MIICrzCCAZcCBgFy/3WZBjANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBjZW50cmFsLXJlZ2lzdHJ5MB4XDTIwMDYyOTA5NDEzNloXDTMwMDYyOTA5NDMxNlowGzEZMBcGA1UEAwwQY2VudHJhbC1yZWdpc3RyeTCCASIwDQYJK"

      \],

      "x5t": "EaMhYGUIvMkp8tvS",

      "x5t2": "vGer6Pt8AhZn8RlbHhAFksOCcGf3u1UWU7Qq",

      "alg": "RS256"

    \}

  \]

\}

 

<a id="_5_Scan_and"></a># [5 Scan and Profile Share ](#_5_Scan_and) 

<a id="_5.1_Overview"></a><a id="_Toc116708"></a>## [5\.1 Overview ](#_5.1_Overview) 

  

The User/Patient can share his/her basic KYC information with the  

HMIS/LIMS by scanning the QR Code using the integrator application \(Example: ABHA App\), which enables them to complete the seamless profile share during their visit\.       

The authenticity of the profile information is verified by the HIE\-CM internally before sharing with the HMIS/LIMS\.  

  

The content of the QR code is a URL \(sample for reference:[ ](https://phrsbx.abdm.gov.in/share-profile?hip-id=IN3410000260&counter-id=12345)

[https://phrsbx\.abdm\.gov\.in/share\-profile?hipid=IN3410000260&counterid=12345\) ](https://phrsbx.abdm.gov.in/share-profile?hip-id=IN3410000260&counter-id=12345)that contains 2 parameters:  

- The HIP ID  
- Facility defined context \(for example: counter code\)  

    

  

  

  

  

  

<a id="_5.2_Sequence_Diagram"></a><a id="_Toc116709"></a>## [5\.2 Sequence Diagram ](#_5.2_Sequence_Diagram) 

[image removed - see original document]

<a id="_5.3_List_of"></a><a id="_Toc116710"></a>## [5\.3 List of APIs ](#_5.3_List_of) 

  

### <a id="_5.3.1__Profile"></a><a id="_Toc116711"></a>5\.3\.1 Profile share  

  

This API will be invoked from the integrator application \(any PHR application, just like ABHA\) to share the user/patient profile with HMIS/LIMS\.  

  

__URL:__ /api/hiecm/patient\-share/v3/share  

__Method: post __ 

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

Authorizatio n  

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc 2F2  

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

JWT Access token which was issued  

by ABDM 

session API after successful validation of client id and secret  

X\-HIU\-ID  

IN2810014366  

Yes  

Identifier of the health information user to which the request was intended  

X\-CM\-ID  

sbx  

Yes  

Suffix of the  consent manager to which the request was intended  

X\-AUTHTOKEN  

eyJhbGciOiJSUzUxMiJ9\.eyJzdWIiOiJna XJpamFAc2J4IiwiY2xpZW50SWQiOiJQS FItV0VCIiwicmVxdWVzdGVySWQiOiJrX 2hpcCIsInN5c3RlbSI6IkFCRE0iLCJtb2Jp bGUiOiI4MjgxMTQ3MDgwIiwiZXhwIjoxNj c3NjY5NDU1LCJpYXQiOjE2Nzc2NjIyNTUs InRyYW5zYWN0aW9uSWQiOiJkMmY5O 

TNkNi1kODg4LTQyMTMtOTc3My0wYmJj MzMwMjVhNGYiLCJhYmhhQWRkcmVzc yI6ImdpcmlqYUBzYngifQ\.Ad\_jGrduH6 \_krBBnlRO912mQabxMOiB0GN6FjdZjoi 

CQY4AkUD3McGq2NR\-X\- GAjHVpkRtKx69m4\_44h\- 

Yes  

JWT Access token which was issued by IDP service after successfully user  

authenticatio n __ __ 

  

 

FqTCbZlo09hq0SEM1KBMkPDl163JcFNM JGnXBa5E\-mu6DpBSPA\- VirSvBVj6CEpZLbTa2nBBSJJi\_leszwHNr 

kdope6rSc2G3SJfCW\_DzFmzd\_fxdvbFCN1yyhN3Rw5r8A1GnSrVSBhRjm4qy5O

\_ gutl1XW9CaBaZSah7GOxGRr4gpSIJJvIL 

WovwG58DyNzEhrHtAfIje\_pegqRsNMO 

FI\- 

xPYJd2x6CcDKSoAXvXO0jbuoOvlPl5kh plOKU\-WcFeWA  

 

 

__Request Headers: __ 

__ __ 

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

This is a key value pair which contains the purpose with the following possible values\.  

PROFILE\_SHARE

OPEN\_PAYMENT\_ORDER

RECORD\_SHARE

metaData  

\{  

  "hipId": "Test\_HIP",   "context": 

"ABC123",   "hprId":  

"abdulkalam@abdm",    "latitude": "\-38\.679",  

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

            "name": "User 1",  

            "gender": "M",  

            "dayOfBirth": "20",  

            "monthOfBirth": "1",  

            "yearOfBirth": "1999",  

            "address": \{                  "line": "C/O  

Sandipan Kshirsagar  

Ambejogai Road Renuka  

Nagar Latur",  

                "district": __null__,  

                "state": __null__,  

                "pincode": __null__  

Yes  

This is key value pair which contains patient details  

 

            \}  

  

            "phoneNumber":  

"9876543210"  

        \}  

    \}  

 

 

__Request body: __ 

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

    \} \}  

######  

__Response:__

Response:__ __ 

Code: 202 ACCEPTED  

__ __ 

__ __ 

__ __ 

### <a id="_5.3.2__Profile"></a>5\.3\.2 	Profile share – Callback  

This is a callback API for patient share API\.  

  

__URL:__ \{callback\_url\}/api/v3/hip/patient/share 

__Method:__ Post

__Request Headers: __ 

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

__Body Parameter: __ 

Property Name  

Example Value  

Required  

Description  

intent  

PROFILE\_SHARE  

Yes  

This is a key value pair which contains the purpose with following possible values\.  

 PROFILE\_SHARE

OPEN\_PAYMENT\_ORDER

RECORD\_SHARE

metaData  

"metaData": \{  

        "hipId": "MAYUR\_HIP",         "context": "ABC123",         "hprId":  

"abdulkalam@abdm",  

        "latitude": "\-38\.679",  

        "longitude": "58\.498"  

    \}  

Yes  

This is a key value pair which contains the location longitude and latitude  

profile  

    "profile": \{  

        "patient": \{  

            "abhaNumber": 

91178386176531,  

Yes  

This is key value pair which contains all the patient details  

 

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

 

 

__ __ 

__Request Body: __ 

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

            "yearOfBirth": "XXXX",  

            "address": \{  

                "line": "C/O Sandipan Kshirsagar Ambejogai Road Renuka Nagar",  

                "district": __null__,  

                "state": __null__,  

                "pincode": __null__  

            \},  

            "phoneNumber": "987654XXXX"  

        \}  

    \} \}  

__ __ 

__ __ 

__ __ 

__ __ 

__Response:  __ 

Response:__ __ 

Response: In call back url below details should be displayed as per the Xauth token  

  

\{"intent":"PROFILE\_SHARE","metaData":\{"hipId":"MAYUR\_HIP","context":"6","hprId":"abdulkal am@hpr\.abdm","latitude":"\- 

38\.670","longitude":"58\.498"\},"profile":\{"patient":\{"abhaNumber":"91178386156891","abhaAddr ess":"911783XX@sbx","name":"User 1",  

"gender":"M","dayOfBirth":"XX","monthOfBirth":"XX","yearOfBirth":"XXXX","address":\{"line":null ,"district":null,"state":null,"pincode":null\},"phoneNumber":"987654XXXX"\}\}\}  

Code: 200 OK  

  

[image removed - see original document]  

  

### <a id="_5.3.3__Profile"></a>5\.3\.3 Profile on share__ __ 

This API will be invoked by HIP to acknowledge the request by the user/patient to share the profile details\.  

  

__URL:__ /api/hiecm/patient\-share/v3/on\-share 

__Method:__ post

__Request Headers:__  

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

Actual time when request was  

initiated, ISO 8601 represents date and time by starting with the year, followed by the month, the day, the hour, the minutes, seconds and milliseconds__ __  

Authorization  

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

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

__ __ 

__Body Parameter: __ 

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

Transaction status from HIP to HIE\- 

CM,   

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

f29f0e59\-8388\-46989fe605db67aeac46  

Yes  

This is a key value pair which contains the purpose  

__ __ 

__Request body __ 

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

    \}  

\}  

__ __ 

###### Response  

__ __ 

Response:__ __ 

Code : 200 OK  

__Request body error:__

__\-> __Use this in case of error response \(Ex: This is the one example for error payload and the code will be same\. But, message will be change each error\)\. 

__ __ 

Request Body:__ __ 

__\{ __

__  "error": \{ __

__    "code": "ABDM\-9999: ", __

__    "message": "string" __

__  \}, __

__  "response": \{ __

__    "requestId": "6f0b4665\-a915\-4c92\-aa36\-65afb4a2cd71" __

__  \} __

__\} __ 

 

<a id="_5.3.4__Profile"></a>### [5\.3\.4 	Profile on share – Callback ](#_5.3.3__Profile) 

This is a callback API for patient on\-share API\.  

  

__URL:__ \{callback\_url\}/api/v3/hiu/patient/on\-share __Method:__ 

Post __Request Headers: __ 

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

f29f0e59\-8388\-46989fe605db67aeac46  

Yes  

This is a key value pair which contains the purpose  

__ __ 

__Request Body __ 

Request Body:__ __ 

\{  

    "acknowledgement": \{  

        "abhaAddress": "abc@abdm",  

        "status": "success",  

        "context": "43",  

        "tokenNumber": "3",  

        "expiry": 180  

    \},  

    "response": \{  

        "requestId": "f29f0e59\-8388\-4698\-9fe6\-05db67aeac46"  

    \}  

\}  

__ __ 

__Response __ 

Response:__ __ 

Code: 200 OK  

[image removed - see original document]  

# 6 Consent manager

<a id="_6.1_Overview"></a>## [6\.1 Overview ](#_5.1_Overview) 

  

The service used to handle consent management before sharing the health data between the entities \(HIP, HIU, PHIU\)   

There are a couple of essential attributes required for consent artefact like Purpose, HI Types, Access mode, Requester, Range, and Validity\.  

HIE\-CM will validate HIU requests for authenticity, replay attack, timestamp, ABHA address, etc\. The request will be saved into the database\. The consent request id will be returned to the called HIU for future tracking purposes\.  

The valid requests will be broadcasted to the priority queue and sent to all the ABDM compliance Patient HIU \(PHR application\)\. The consent notification status will be saved into the database\.  

Upon successful acknowledgment, the consent artifact will be generated and saved into the database\. HIECM will further share this consent artefact with HIP and HIU\.  

## <a id="_6.2_Sequence_Diagram"></a>6\.2 Sequence Diagram  

  [image removed - see original document]

## <a id="_6.3_API_Information"></a>6\.3 API Information Request & Response  

## <a id="_6.4_HIE-CM_-"></a>6\.4 HIE\-CM \- Consent request init

This is an API that will be invoked by HIU to initiate a consent request to get data about a patient\.  

While requesting and exchanging health information, there are meta codes that are relevant to you if you are a HIU\.  

•  	Purpose of Use \- defines what is the purpose of use of the health information that a HIU is requesting for\. The following are subset from http://terminology\.hl7\.org/ValueSet/v3\-PurposeOfUse  

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

  

__URL:__ /api/hiecm/consent/v3/request/init 

__Request:__ POST 

__Header Parameters:__   

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

__Actual time when request was initiated, ISO Date time format represents date and __

__time__  

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

  

  

  

__Body Parameters:   __

Property Name  

Example Value  

Required  

Description  

Patient  

  

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

[www\.test\.com  ](http://www.test.com/)

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

Health information user Id  

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

[https://www\.mciindia\.org  ](https://www.mciindia.org/)

yes  

Requester identifier system  

hiTypes  

\["Prescription",  

"DiagnosticReport",  

"DischargeSummary  

"ImmunizationRecord",  

"HealthDocumentRecord",  

"WellnessRecord",  

"OPConsultation, 

Invoice"\]  

yes  

There are 8 different hiTypes in  ABDM:  

Prescription  

DiagnosticReport  

OPConsultation  

DischargeSummary  

ImmunizationRecord  

HealthDocumentRecord 

WellnessRecord 

          Invoice 

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

hiTypes of the patient 

details\. It is  

a list, there can be more than one hitype\.  

__ __ 

__Request Body:  __ 

Request Body  

  \{  

    "consent": \{  

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

            "OPConsultation" , 

           "Invoice" , 

        \],  

        "patient": \{  

            "id": "abhaaddress@sbx"  

        \},  

        "purpose": \{  

            "code": "CAREMGT",  

            "text": "Care Management",  

            "refUri": "www\.abdm\.gov\.in"  

        \},  

        "requester": \{  

            "name": "Dr\. Manju",  

            "identifier": \{  

                "type": "REGNO",  

                "value": "MH1001",  

                "system": "https://www\.mciindia\.org"  

            \}  

        \},  

        "permission": \{  

            "dateRange": \{  

                "to": "2024\-07\-17T12:05:57\.151Z",  

                "from": "1924\-07\-09T12:05:57\.151Z"  

            \},  

            "frequency": \{  

                "unit": "DAY",  

                "value": 0,  

                "repeats": 0  

            \},  

            "accessMode": "VIEW",  

            "dataEraseAt": "2124\-11\-09T00:00:00\.000Z"  

        \},  

        "careContexts": \[  

            \{  

                "patientReference": "xxxx@sbx",  

                "careContextReference": "COCa496bc2f\-ca6c\-4af5\-b973\-02e915fd9815"  

        \}

\]

\}

\}

Response  

Code : 202 Accepted  

  

__Error scenarios: __ 

__Scenarios __ 

__Request Body __ 

__Response __ 

To verify  when  

Request ID is 

Blank, null or empty in header  

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

be in Care Management,  

Break the Glass, Public Health,  

Healthcare Payment, Disease  

Specific Healthcare Research, Self  Requested"  

\}  

  

 

Disease  

Specific  

Healthcare  Research, Self Requested  

   

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

    "message": "Consent purpose code cannot be null"  

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

    "message": "Invalid purpose code, it must be in CAREMGT, BTG, PUBHLTH, 

HPAYMT, DSRCH, PATRQT"  

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

            "refUri": ""  

        \},  

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

            "refUri": ""  

        \},  

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

 

  

  

  

# <a id="_6.5_HIE-CM-_Consent"></a>6\.5 HIE\-CM\- Consent request init \- call back

This API initiated by HIE\-CM to get the consent request call back to HIU  

__ __ 

__URL__: \{callback\}/api/v3/hiu/consent/request/on\-init 

__Request:__ POST 

__Header Parameters:__   

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

  \}  

\}  

  

__ __ 

__Response Body:__   

Response  

Code : 202 Accepted  

[image removed - see original document]__ __ 

This API initiated by HIE\-CM to get the consent request call back to HIU  

__ __ 

__URL__: \{callback\}/api/v3/hiu/consent/request/on\-init 

__Request:__ POST 

__Header Parameters:__   

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

  \}  

\}  

  

__ __ 

__Response Body:__   

Response  

Code : 202 Accepted  

[image removed - see original document]__ __ 

# <a id="_6.6_HIE-CM-_Callback"></a>6\.6 HIE\-CM\- Callback API to HIU when consent request is APPROVED/REVOKED/DENIED

Once the patient grants consent to the HIU, the CM notifies the HIU system of the consent grant via the gateway\. If the patient grants for multiple HIPs, then multiple consent artefacts are generated \- one for each HIP\. The HIU now first fetches all the consent\-artefacts that were generated for his request\.__ __ 

__URL__: \{\{callback\}\} /api/v3/hiu/consent/request/notify 

__Request:__ POST  

__Header Parameters:__   

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

        "id": “3fa85f64\- 

5717\-4562\-b3fc\- 

2c963f66afa6”  

      \}  

    \]  

No  

List of consent artefact ids that was created  

__Request Body:__   

Request Body:  

\{  

  "notification": \{  

    "consentRequestId": "e3c74829\-3f82\-4f94\-959e\-e10f57bcd57b",     "status": "GRANTED",  

    "reason": null,  

    "consentArtefacts": \[  

      \{  

        "id": "<consent\-artefact\-id>"  

      \}  

    \]  

  \}  

\}  

__ __ 

__Response Body__:   

Response  

Status: 202 Accepted  

  

[image removed - see original document]  

# <a id="_6.7_HIE-CM_–"></a>6\.7 HIE\-CM – API for HIU to respond back to consent HIU callback 

This API will be invoked by HIU to respond back to HIE\-CM when they received notify call after approve /deny / revoke\.   

/api/v3/hiu/consent/request/notify\.__ __ 

__URL:__ /api/hiecm/consent/v3/request/hiu/on\-notify 

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

    "code": "ABDM\-1001",  

    "message": "unable to connect database"  

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

  \}  

\}  

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

To verify when Request ID is Blank,  null or empty in header  

\[  

    \{  

        "key": "REQUEST\-ID",  

Access Denied   

Code : 403 Forbidden   

  

  

        "value": "",  

        "type": "text"  

    \}  

\]  

   

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

ID"  

\}  

  

Code \- 400Bad Request  

  

  

When Timestamp is 

Blank, null or empty in header\.   

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "",  

        "type": "text"  

    \}  

\]  

  

Access Denied   

Code : 403 Forbidden   

  

  

   

  

When invalid Timestamp 

is pass  in header  

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1016: ",  

    "message": "Invalid Time stamp"  

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

  

  

# <a id="_6.8_HIE-CM_–_1"></a>6\.8 HIE\-CM – API for HIP to respond back to consent HIP callback 

This API will be invoked by HIP to respond back to HIE\-CM when they received notify call after approve /deny / revoke\.   

/api/v3/hiu/consent/request/notify\.__ __ 

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

    "code": "ABDM\-1001",  

    "message": "unable to connect database"  

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

  \}  

\}  

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

To verify when Request ID is Blank, null or empty in header  

\[  

    \{  

        "key": "REQUEST\-ID",  

Access Denied   

Code : 403 Forbidden   

  

  

        "value": "",  

        "type": "text"  

    \}  

\]  

   

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

ID"  

\}  

  

Code \- 400Bad Request  

  

  

When Timestamp is 

Blank, null or empty in header\.   

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "",  

        "type": "text"  

    \}  

\]  

  

Access Denied   

Code : 403 Forbidden   

  

  

sWhen invalid Timestamp 

is pass  in header  

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1016: ",  

    "message": "Invalid Time stamp"  

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

  

  

# <a id="_6.8_HIE-CM_–"></a><a id="_6.9_HIE-CM-_Consent"></a><a id="_6.8_HIE-CM-_Consent"></a>6\.9 HIE\-CM\- Consent request status

This API will be called to get the status of the consent request\.  

__URL:__ /api/hiecm/consent/v3/request/status 

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

    "consentRequestId": "05f14b1d\-4465\-453a\-8249\-1382d79d271d"  

\}  

  

__Response Body__:   

Response  

Code : 200 OK   

  

__Error scenarios: __ 

Scenarios  

Headers/Body  

Message  

To verify when  

Request ID is 

Blank, null or empty in header  

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

        "value": "*\{\{$guid\}\}*zxzzxs",  

\{  

    "code": "ABDM\-1030: ",  

    "message": "Invalid request ID"  

\}  

 

 

        "type": "text"  

    \}  

\]  

  

Code \- 400Bad Request  

  

  

When  

Timestamp  

is Blank, null or empty in header\.   

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "",  

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

   

When X\-HIU\- 

ID is Blank, null or empty in header\.    

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

        "requestId": "fe717659\-f438\- 4bda\-8f7c\-0ba13e9c5f61"  

    \}  

\}  

  

code \- 200 OK  

When  

passing Null Consent  

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

  

  

# <a id="_6.10_HIE-CM-_Consent"></a>6\.10 HIE\-CM\- Consent request on\-status \(Callback\)

<a id="OLE_LINK3"></a><a id="_Toc176957959"></a>This API is used to send the status of consent request back to HIU through HIE\-CM  

__URL:__ \{callback\_url\}/api/v3/hiu/consent/request/on\-status

 __Request:__ POST

__ Header Parameters: __  

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

Date time format represents date and time\.__ __ 

X\-HIU\-ID  

HIU\_ID  

Yes  

Identifier of the health information user to which the request was intended  

Authorization  

Gateway Session Token  

Yes  

ABDM Gateway Session Token__ __ 

__Body Parameters:  __ 

__Property Name __ 

__Example Value __ 

__Required __ 

__Description __ 

consentRequest\-id  

18235d89\-cb13\-479dad71\-

7a57d5f669a8  

Yes  

Unique UUID for consent request__ __ 

consentRequeststatus  

“REQUESTED”  

Yes  

Current status of consent request  

response\-requestId  

aa9e2d8e\-c4f647048baba8c365f693d5  

Yes  

Unique UUID for the callback request  

resp  

null  

  

  

__Request__

__ __

__Body__

__:__

__  __

 

Request Body:

 

 

 

\{

 

  

"

consentRequest

": \{ 

 

    

"

id": 

"7d52fcd0

\-

a52a

\-

4

d

82

\-

b9f5

\-

a548e5053088",     "

status

": 

"REQUESTED" 

 

  

\}

, 

 

  

"

error

": null, 

 

  

"

response

": \{ 

 

    

"

requestId

": "e1f08798

\-

8949

\-

4

a

23

\-

a04e

\-

fe0054397cf5" 

 

  

\}

, 

 

  

"

resp

": null 

 

\}

 

 

 

 

__ __ 

__Response Body__: The table below illustrates the response body  

  

Response  

Code : 200 OK   

[image removed - see original document]__ __ 

# <a id="_6.11_HIE-CM_-"></a><a id="_6.10_HIE-CM_-"></a>6\.11 HIE\-CM \- Consent request fetch 

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

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

__Request Body:__   

Request Body:  

\{  

   "consentId": "d6a83f24\-6c96\-421e\-b8b8\-844e5344ef69"  

\}   

__Response Body:__   

 

Response  

Code : 202 OK  

 

__Error Scenario:__   

Scenarios  

Headers/Body  

Message  

To verify when  

Request ID is 

Blank, null or empty in header  

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

        "key": "TIMESTAMP",  

        "value": "",  

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

  

When X\- CM\-ID is  

Invalid,  

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

 

When X\- 

HIU\-ID is Blank, null or empty in header\.    

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

        "requestId": "7c4c31da\-dfd0\-4348a907c08ea4016cbe"  

    \}  

\}  

  

code \- 200 OK  

When  

passing Null Consent  artefact Id  

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

# <a id="_6.12_HIE-CM_–"></a><a id="_6.11_HIE-CM_–"></a>6\.12 HIE\-CM – Get All Links Records

This API will be invoked by HIU to get the All links\.

__URL:__ api/hiecm/hip/v3/link/patient/links?limit=\-1

__Request:__ GET  

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN  

Auth token  

Yes  

JWT Access token which was issued by PHR service after successfully user authentication\. If HIP does not have any role, then it is mandatory

__Response:__

 

Response  

\[

    \{

        "id": 20744,

        "patientId": "hitit@sbx",

        "tokenNumber": "19",

        "hipId": "MAYUR\_HIP",

        "hipName": "MAYURHIP",

        "hipAddress": "DEFAULT",

        "expiresIn": "180",

        "clientId": "MAYUR\_HIU",

        "dateCreated": "2024\-12\-23T10:15:39\.581Z",

        "counterCode": "123456"

    \}

\]

 

__ __ 

# <a id="_6.13_HIE-CM_–"></a>6\.13 HIE\-CM – Consent Auto Approve

This API is invoked by the Health Information User \(HIU\) to create Auto Approval policy for consent request\. This includes the list of HI types, the purpose and a date range between the policy will be active\. Whenever a HIU that have an active auto approval policy raises a consents, the consent will be auto approved\.

__URL:__ / api/hiecm/consent/v3/auto/approve

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN

token  

Yes  

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

__Body parameters:__   

__Property Name __ 

__Example Value __ 

__Required __ 

__Description __ 

isApplicableForAllHIPs

__true__

Yes  

This is  Applicable For All HIPs\.

includedSources

__hiTypes__

Yes

 Types of HIU 

"Prescription",

                "DiagnosticReport",

                "OPConsultation",

                "DischargeSummary",

                "ImmunizationRecord",

                "HealthDocumentRecord",

                "WellnessRecord",

                "Invoice"

__Request Body:__   

Request Body:  

\{

    "isApplicableForAllHIPs": __true__,

    "hiu": \{

        "id": "*\{\{hiu\-id\}\}*"

    \},

    "includedSources": \[

        \{

            "hiTypes": \[

                "Prescription",

                "DiagnosticReport",

                "OPConsultation",

                "DischargeSummary",

                "ImmunizationRecord",

                "HealthDocumentRecord",

                "WellnessRecord",

                "Invoice"

            \],

            "purpose": \{

                "text": "Care Management",

                "code": "CAREMGT",

                "refUri": "www\.abdm\.gov\.in"

            \},

            "period": \{

                "from": "2024\-11\-27T16:21:00\.000Z",

                "to": "2024\-12\-30T00:00:00\.000Z"

            \}

        \}

    \],

    "excludedSources": \[\]

\}

__Response Body:__   

 

Response  

Code : 202 OK  

 

__Error Scenario:__   

Scenarios  

Headers/Body  

Message  

To verify  when  

Request ID is 

Blank, null or empty in header  

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

        "key": "TIMESTAMP",  

        "value": "",  

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

  

When X\- CM\-ID is  

Invalid,  

Blank, null or empty in header\.   

\[  

    \{  

        "key": "X\-CM\-ID",  

        "value": "sbxdvdfvdf",  

        "type": "text"

\}\]  

Access Denied   

Code : 403 Forbidden   

   

 

 When X\-AUTH\-TOKEN is Invalid

 Bearer \{\{auth\-token\}\}

 Code \- 400Bad Request  

When body 

missing  

   

\{  

    "code": "ABDM\-1064",  

    "message": "Request body was missi ng"  

\}  

  

Code \- 400Bad Request  

__ __ 

# <a id="_6.14_HIE-CM_–"></a>6\.14 HIE\-CM – Consent Disable Auto Approve

This API is invoked by the Health Information User \(HIU\) to disable the automatic approval of consent requests\.

__URL:__ /api/hiecm/consent/v3/auto/approve/\{\{consentId\}\}/disable

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN

token  

Yes  

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

__Response Body:__   

 

Response  

Code : 202 accepted    
  


 

__Error Scenario:__   

Scenarios  

Headers/Body  

Message  

To verify  when  

Request ID is 

Blank, null or empty in header  

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

        "key": "TIMESTAMP",  

        "value": "",  

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

  

When X\- CM\-ID is  

Invalid,  

Blank, null or empty in header\.   

\[  

    \{  

        "key": "X\-CM\-ID",  

        "value": "sbxdvdfvdf",  

        "type": "text"

\}\]  

Access Denied   

Code : 403 Forbidden   

   

 

 When X\-AUTH\-TOKEN is Invalid

 Bearer \{\{auth\-token\}\}

 Code \- 400Bad Request  

# <a id="_6.15_HIE-CM_–"></a>6\.15 HIE\-CM – Consent Enable Auto Approve

This API is invoked by the Health Information User \(HIU\) to enable the automatic approval of consent requests\.__ __

__URL:__ //api/hiecm/consent/v3/auto/approve/\{\{consentId\}\}/enable

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN

token  

Yes  

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

__Response Body:__   

 

Response  

Code : 202 OK    


 

__Error Scenario:__   

Scenarios  

Headers/Body  

Message  

To verify  when  

Request ID is 

Blank, null or empty in header  

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

        "key": "TIMESTAMP",  

        "value": "",  

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

  

When X\- CM\-ID is  

Invalid,  

Blank, null or empty in header\.   

\[  

    \{  

        "key": "X\-CM\-ID",  

        "value": "sbxdvdfvdf",  

        "type": "text"

\}\]  

Access Denied   

Code : 403 Forbidden   

   

 

 When X\-AUTH\-TOKEN is Invalid

 Bearer \{\{auth\-token\}\}

 Code \- 400Bad Request  

# <a id="_6.16_HIE-_CM"></a><a id="_6.15_HIE-_CM"></a>6\.16 HIE\- CM – Get all consent Request for an ABHA Address

This API will be invoked by HIU to get the all consent requests for an ABHA Address\.

__URL:__ /api/hiecm/consent/v3/request?limit=10&offset=0&status=ALL

__Request:__ GET  

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN  

Auth token  

Yes  

JWT Access token which was issued by PHR service after successfully user authentication\. If HIP does not have any role, then it is mandatory

__Response Body:__   

 

Response  

Code : 200 OK    
\{

  "size": 10,

  "limit": 10,

  "offset": 0,

  "requests": \[

    \{

      "requestId": "e5ec415f\-c098\-40f6\-a0db\-faa162fc5295",

      "purpose": \{

        "text": "Care Management",

        "code": "CAREMGT",

        "refUri": "www\.abc\.com"

      \},

      "patient": \{

        "id": "abdulkalam@abdm"

      \},

      "hip": \{

        "id": "cowin\_hip\_01",

        "name": "Cowin",

        "type": "HIP"

      \},

      "hiu": \{

        "id": "cowin\_hiu\_01",

        "name": "Cowin",

        "type": "HIU"

      \},

      "careContexts": \[

        \{

          "patientReference": "batman@tmh",

          "careContextReference": "Episode1"

        \}

      \],

      "requester": \{

        "name": "abdulkalam@abdm",

        "identifier": \{

          "value": "REG1",

          "type": "MH1001",

          "system": "https://www\.sample\.com"

        \}

      \},

      "status": "GRANTED",

      "createdAt": "2021\-09\-28T12:30:08\.573Z",

      "lastUpdated": "2021\-09\-28T12:30:08\.573Z",

      "hiType": \[

        "Prescription, DiagnosticReport, OPConsultation, DischargeSummary, ImmunizationRecord, HealthDocumentRecord, WellnessRecord,Invoice"

      \],

      "permission": \{

        "accessMode": "VIEW",

        "dateRange": \{

          "from": "2021\-09\-28T12:30:08\.573Z",

          "to": "2021\-09\-28T12:30:08\.573Z"

        \},

        "dataEraseAt": "2021\-09\-28T12:30:08\.573Z",

        "frequency": \{

          "unit": "HOUR",

          "value": 1,

          "repeats": 0

        \}

      \}

    \}

  \]

\}

 

# <a id="_6.17_HIE-_CM"></a>6\.17 HIE\- CM – Get consent Request details by consent request Id\.

__ __This API will be invoked by HIU to get the consent request by request id\.

__URL:__  /api/hiecm/consent/v3/request/\{\{consentRequestId\}\}

__Request:__ GET  

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN  

Auth token  

Yes  

JWT Access token which was issued by PHR service after successfully user authentication\. If HIP does not have any role, then it is mandatory

__Response Body:__   

 

Response  

Code : 200 OK    
\{

  "requestId": "e5ec415f\-c098\-40f6\-a0db\-faa162fc5295",

  "purpose": \{

    "text": "Care Management",

    "code": "CAREMGT",

    "refUri": "www\.abc\.com"

  \},

  "patient": \{

    "id": "abdulkalam@abdm"

  \},

  "hip": \{

    "id": "cowin\_hip\_01",

    "name": "Cowin",

    "type": "HIP"

  \},

  "hiu": \{

    "id": "cowin\_hiu\_01",

    "name": "Cowin",

    "type": "HIU"

  \},

  "careContexts": \[

    \{

      "patientReference": "batman@tmh",

      "careContextReference": "Episode1"

    \}

  \],

  "requester": \{

    "name": "abdulkalam@abdm",

    "identifier": \{

      "value": "REG1",

      "type": "MH1001",

      "system": "https://www\.sample\.com"

    \}

  \},

  "status": "GRANTED",

  "createdAt": "2021\-09\-28T12:30:08\.573Z",

  "lastUpdated": "2021\-09\-28T12:30:08\.573Z",

  "hiType": \[

    "Prescription, DiagnosticReport, OPConsultation, DischargeSummary, ImmunizationRecord, HealthDocumentRecord, WellnessRecord,Invoice"

  \],

  "permission": \{

    "accessMode": "VIEW",

    "dateRange": \{

      "from": "2021\-09\-28T12:30:08\.573Z",

      "to": "2021\-09\-28T12:30:08\.573Z"

    \},

    "dataEraseAt": "2021\-09\-28T12:30:08\.573Z",

    "frequency": \{

      "unit": "HOUR",

      "value": 1,

      "repeats": 0

    \}

  \}

\}

 

# <a id="_6.18_HIE-_CM"></a>6\.18 HIE\- CM – Get All consent\-artefact\-details\-by\-request\-id\.

This API will be invoked by HIU to get the All\-consent artifact details by request id\.

__URL:__  /api/hiecm/consent/v3/artefact/request/\{\{consentRequestId\}\}

__Request:__ GET  

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN  

Auth token  

Yes  

JWT Access token which was issued by PHR service after successfully user authentication\. If HIP does not have any role, then it is mandatory

__Response Body:__   

 

Response  

Code : 200 OK    
\[

  \{

    "status": "GRANTED",

    "consentDetail": \{

      "consentId": "e5ec415f\-c098\-40f6\-a0db\-faa162fc5295",

      "purpose": \{

        "text": "Care Management",

        "code": "CAREMGT",

        "refUri": "www\.abc\.com"

      \},

      "patient": \{

        "id": "abdulkalam@abdm"

      \},

      "hip": \{

        "id": "cowin\_hip\_01",

        "name": "Cowin",

        "type": "HIP"

      \},

      "hiu": \{

        "id": "cowin\_hiu\_01",

        "name": "Cowin",

        "type": "HIU"

      \},

      "careContexts": \[

        \{

          "patientReference": "batman@tmh",

          "careContextReference": "Episode1"

        \}

      \],

      "requester": \{

        "name": "abdulkalam@abdm",

        "identifier": \{

          "value": "REG1",

          "type": "MH1001",

          "system": "https://www\.sample\.com"

        \}

      \},

      "createdAt": "2021\-09\-28T12:30:08\.573Z",

      "lastUpdated": "2021\-09\-28T12:30:08\.573Z",

      "schemaVersion": "v3",

      "consentManager": \{

        "id": "abdm"

      \},

      "hiTypes": \[

        "Prescription"

      \],

      "permission": \{

        "accessMode": "VIEW",

        "dateRange": \{

          "from": "2021\-09\-28T12:30:08\.573Z",

          "to": "2021\-09\-28T12:30:08\.573Z"

        \},

        "dataEraseAt": "2021\-09\-28T12:30:08\.573Z",

        "frequency": \{

          "unit": "HOUR",

          "value": 1,

          "repeats": 0

        \}

      \}

    \},

    "signature": "Signature of CM as defined in W3C standards; Base64 encoded"

  \}

\]

 

# <a id="_6.19_HIE-_CM"></a>6\.19 HIE\- CM – Get consent\-artefact\-details\-by\-artifact\-id\.

This API will be invoked by HIU to get the consent artifact details by artifact id\.

__URL:__  /api/hiecm/consent/v3/artefact/\{\{consentId\}\}

__Request:__ GET  

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN  

Auth token  

Yes  

JWT Access token which was issued by PHR service after successfully user authentication\. If HIP does not have any role, then it is mandatory

__Response Body:__   

 

Response  

Code: 200 ok

\[

  \{

    "status": "GRANTED",

    "consentDetail": \{

      "consentId": "e5ec415f\-c098\-40f6\-a0db\-faa162fc5295",

      "purpose": \{

        "text": "Care Management",

        "code": "CAREMGT",

        "refUri": "www\.abc\.com"

      \},

      "patient": \{

        "id": "abdulkalam@abdm"

      \},

      "hip": \{

        "id": "cowin\_hip\_01",

        "name": "Cowin",

        "type": "HIP"

      \},

      "hiu": \{

        "id": "cowin\_hiu\_01",

        "name": "Cowin",

        "type": "HIU"

      \},

      "careContexts": \[

        \{

          "patientReference": "batman@tmh",

          "careContextReference": "Episode1"

        \}

      \],

      "requester": \{

        "name": "abdulkalam@abdm",

        "identifier": \{

          "value": "REG1",

          "type": "MH1001",

          "system": "https://www\.sample\.com"

        \}

      \},

      "createdAt": "2021\-09\-28T12:30:08\.573Z",

      "lastUpdated": "2021\-09\-28T12:30:08\.573Z",

      "schemaVersion": "v3",

      "consentManager": \{

        "id": "abdm"

      \},

      "hiTypes": \[

        "Prescription"

      \],

      "permission": \{

        "accessMode": "VIEW",

        "dateRange": \{

          "from": "2021\-09\-28T12:30:08\.573Z",

          "to": "2021\-09\-28T12:30:08\.573Z"

        \},

        "dataEraseAt": "2021\-09\-28T12:30:08\.573Z",

        "frequency": \{

          "unit": "HOUR",

          "value": 1,

          "repeats": 0

        \}

      \}

    \},

    "signature": "Signature of CM as defined in W3C standards; Base64 encoded"

  \}

\]

 

# <a id="_6.20_HIE-_CM"></a>6\.20 HIE\- CM – Get all consent artifact details for an ABHA Address\.

This API will be invoked by HIU to get the All\-consent artifact id for an ABHA Address\.

__URL:__  /api/hiecm/consent/v3/artefact?limit=10&offset=0&status=ALL

__  Request:__ GET  

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN  

Auth token  

Yes  

JWT Access token which was issued by PHR service after successfully user authentication\. If HIP does not have any role, then it is mandatory

__Response Body:__   

 

Response  

Code : 200 OK    


\{

  "size": 10,

  "limit": 10,

  "offset": 0,

  "consentArtefacts": \[

    \{

      "status": "GRANTED",

      "consentDetail": \{

        "consentId": "e5ec415f\-c098\-40f6\-a0db\-faa162fc5295",

        "purpose": \{

          "text": "Care Management",

          "code": "CAREMGT",

          "refUri": "www\.abc\.com"

        \},

        "patient": \{

          "id": "abdulkalam@abdm"

        \},

        "hip": \{

          "id": "cowin\_hip\_01",

          "name": "Cowin",

          "type": "HIP"

        \},

        "hiu": \{

          "id": "cowin\_hiu\_01",

          "name": "Cowin",

          "type": "HIU"

        \},

        "careContexts": \[

          \{

            "patientReference": "batman@tmh",

            "careContextReference": "Episode1"

          \}

        \],

        "requester": \{

          "name": "abdulkalam@abdm",

          "identifier": \{

            "value": "REG1",

            "type": "MH1001",

            "system": "https://www\.sample\.com"

          \}

        \},

        "createdAt": "2021\-09\-28T12:30:08\.573Z",

        "lastUpdated": "2021\-09\-28T12:30:08\.573Z",

        "schemaVersion": "v3",

        "consentManager": \{

          "id": "abdm"

        \},

        "hiTypes": \[

          "Prescription"

        \],

        "permission": \{

          "accessMode": "VIEW",

          "dateRange": \{

            "from": "2021\-09\-28T12:30:08\.573Z",

            "to": "2021\-09\-28T12:30:08\.573Z"

          \},

          "dataEraseAt": "2021\-09\-28T12:30:08\.573Z",

          "frequency": \{

            "unit": "HOUR",

            "value": 1,

            "repeats": 0

          \}

        \}

      \},

      "signature": "e8nY601CYDsC0FKoDjSp\+7GeQ2s2R8oZncLCz5ce\+pEuDOr5bZV0aaHjwJg4b9S9V\+twjt4hbojx3fl7egrt8\+0c\+lfPTi5/bBUAQXCABTfFmtFU7jn65HlTt8kgkiONx26ZBhJ0wX3xjYI72PPtzYIiT5Q08YtDoILA62KceioV7lwuKssw7wC4ECbBAvRuXT121TmtrPhf\+0myJATSnaajS06S6OthrKfZLNTUFf3pFiJzqouSTrjNblOX6DT2\+JuO3rom1Szz/03c0HQG\+wWASv\+PO3J6uRs0UI4JvKmM/4tP\+Z\+/HPKM15K5U5K\+4pqf6czKrbIDpkT/kP8bGg=="

    \}

  \]

\}

 

# <a id="_7_Data_Flow"></a><a id="_6.21_HIE-CM-Deny_-"></a>6\.21 HIE\-CM\-Deny \- Consent Request

This API endpoint is used to deny a consent request from the Personal Health Record \(PHR\) or mobile application\. By invoking this API, users can reject a consent request, preventing the Health Information User \(HIU\) from accessing their health data\.

__URL:__  /api/hiecm/consent/v3/request/\{\{consentRequestId\}\}/deny

__  Request:__ POST  

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN  

Auth token  

Yes  

JWT Access token which was issued by PHR service after successfully user authentication\. If HIP does not have any role, then it is mandatory

__Request Body:__   

Request Body:  

\{

  "reason": "Not authorized"

\}

__Response Body:__   

 

Response  

Code : 202 OK  

 

__Error Scenario:__   

Scenarios  

Headers/Body  

Message  

To verify when  

Request ID is 

Blank, null or empty in header  

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

        "key": "TIMESTAMP",  

        "value": "",  

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

  

When X\- CM\-ID is  

Invalid,  

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

 

When X\- 

HIU\-ID is Blank, null or empty in header\.    

\[  

    \{  

        "key": "X\-HIU\-ID",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

   

# <a id="_6.22_HIE-CM-Revoke_-"></a>6\.22 HIE\-CM\-Revoke \- Consent Request

This API endpoint is used to revoke a previously approved consent from the Personal Health Record \(PHR\) or mobile application\. By invoking this API, users can withdraw their consent, thereby terminating the permissions granted to access their health data\. 

__URL:__  /api/hiecm/consent/v3/revoke

__  Request:__ POST  

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

__Actual time when request was initiated, ISO __

__Date time format represents date and time __ 

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-AUTH\-TOKEN  

Auth token  

Yes  

JWT Access token which was issued by PHR service after successfully user authentication\. If HIP does not have any role, then it is mandatory

__Body parameters:__   

 __Body__ __parameters__:  

\{

    "consents": \[

        "*\{\{consentId\}\}*"

    \]

\}

__Request Body:__   

Request Body:  

\{

    "consents": \[

        "*\{\{consentId\}\}*"

    \]

\}

__Response Body:__   

 

Response  

Code : 202 OK  

 

__Error Scenario:__   

Scenarios  

Headers/Body  

Message  

To verify when  

Request ID is 

Blank, null or empty in header  

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

        "key": "TIMESTAMP",  

        "value": "",  

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

  

When X\- CM\-ID is  

Invalid,  

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

 

When X\- 

HIU\-ID is Blank, null or empty in header\.    

\[  

    \{  

        "key": "X\-HIU\-ID",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

   

# 7 Data Flow

# <a id="_7.1_Overview"></a>7\.1 Overview

The process of Data flow starts once the HIECM has generated Consent artefact \(Consent artefact is generated only if the status of Consent request is “Granted”\) and same is notified to HIP and HIU\.  

HIU sends pushback URL to HIP via HIECM\. HIP now bundles the care context or Health data of the patient as per FHIR standards and share the data via pushback data URL\. HIECM is notified the status of the data shared both by HIU and HIP\.  

# <a id="_7.2_Sequence_Diagram"></a>7\.2 Sequence Diagram  

# [image removed - see original document]

# <a id="_7.3_API_Information"></a>7\.3 API Information Request & Response  

# <a id="_7.3.1_Data_flow"></a>7\.3\.1 Data flow – Data request invoked by HIU 

The HIU system initiates data request for a patient’s health information to the HIP against the relevant consent\-artefact, through the CM\.  

As part of the data request, the HIU’s health repository embeds three key elements within the health information request:  

The consent ID corresponding to the consent artefact against which the information request is being made\.  

A data push URL, which is a callback URL that indicators where the information can be pushed by the HIP’s health repository\. This URL can be different from the HIU’s access URL, provided at the time of registration with the gateway\. The HIU can specify a different URL for the data flow, in order to keep its identity secret to the extent possible\.  

Several parameters such as the date\-time range for the requested and a set of encryption parameters for the HIP repository to encrypt the information\. The Elliptic\-curve Diffie– Hellman based encryption standard is used for encrypting health information\.  

Upon receipt of the data\-request, CM assigns a transaction ID \(txn\-id\) for the entire data flow and communicates this Id to the health repositories of the HIU and the HIP\.  

The HIU’s health repository relays all this information to the CM through the gateway\. From the CM, the information is relayed to the HIP’s health repository \(via the HIE\-CM\)\.  

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

Unique UUID for track the end\-toend request transaction  

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

    \}  

\]  

Yes  

Date Range against which the consent granted will be validated\.  

DataPushUrl  

[https://webhook\.site/2cfcc184\-5d29\-4e2c974d3e56cbaa5cc1/v3/data/push  ](https://webhook.site/2cfcc184-5d29-4e2c-974d-3e56cbaa5cc1/v3/data/push)

Yes  

This is the URL provided by HIU to which HIP has to push the requested health information record  

cryptoAlg  

“ECDH”  

  

ECDH is a key sharing algorithm, most commonly used to send encrypted messages\. ECDH works by multiplying your private key by another's public key to get a shared secret, then using that shared 

secret 	to 	perform 

symmetric encryption  

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

key agreement protocol that allows two parties, 

each having an 

ellipticcurve public–private key pair, to establish a shared secret over an insecure channel  

Request Body: The table below illustrates the request body    

Request Body  

\{  

      "__hiRequest__": \{  

        "__consent__": \{  

            "__id__": "004ff8e6\-a9d7\-4963\-822b\-d9762179314e"  

        \},  

        "__dateRange__": \{  

            "__from__": "1924\-07\-09T12:05:57\.151Z",  

            "__to__": "2024\-07\-17T12:05:57\.151Z"  

        \},  

        "__dataPushUrl__": "https://webhook\.site/2cfcc184\-5d29\-4e2c\-974d\-3e56cbaa5cc1/v3/data/push",  

        "__keyMaterial__": \{  

            "__cryptoAlg__": "ECDH",  

            "__curve__": "Curve25519",  

            "__dhPublicKey__": \{  

                "__expiry__": "2124\-11\-09T00:00:00\.000Z",  

                "__parameters__": "Curve25519/32byte random key",  

                "__keyValue__":  

"BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0D pA="  

            \},  

            "__nonce__": "0ka0stPfqmXWhX\+ODC/iOFMO0PXFdRjBdcEGbv55qqc="  

        \}  

    \}  

\}  

  

__ __ 

__Response Body:__ The table below illustrates the response body  

Response  

Code : 202 Accepted  

  

[image removed - see original document]  

The HIU’s health repository relays all this information to the CM through the gateway\. From the CM, the information is relayed to the HIP’s health repository \(via the HIE\-CM\)\.  

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

Unique UUID for track the end\-toend request transaction  

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

    \}  

\]  

Yes  

Date Range against which the consent granted will be validated\.  

DataPushUrl  

[https://webhook\.site/2cfcc184\-5d29\-4e2c974d3e56cbaa5cc1/v3/data/push  ](https://webhook.site/2cfcc184-5d29-4e2c-974d-3e56cbaa5cc1/v3/data/push)

Yes  

This is the URL provided by HIU to which HIP has to push the requested health information record  

cryptoAlg  

“ECDH”  

  

ECDH is a key sharing algorithm, most commonly used to send encrypted messages\. ECDH works by multiplying your private key by another's public key to get a shared secret, then using that shared 

secret 	to 	perform 

symmetric encryption  

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

key agreement protocol that allows two parties, 

each having an 

ellipticcurve public–private key pair, to establish a shared secret over an insecure channel  

Request Body: The table below illustrates the request body    

Request Body  

\{  

      "__hiRequest__": \{  

        "__consent__": \{  

            "__id__": "004ff8e6\-a9d7\-4963\-822b\-d9762179314e"  

        \},  

        "__dateRange__": \{  

            "__from__": "1924\-07\-09T12:05:57\.151Z",  

            "__to__": "2024\-07\-17T12:05:57\.151Z"  

        \},  

        "__dataPushUrl__": "https://webhook\.site/2cfcc184\-5d29\-4e2c\-974d\-3e56cbaa5cc1/v3/data/push",  

        "__keyMaterial__": \{  

            "__cryptoAlg__": "ECDH",  

            "__curve__": "Curve25519",  

            "__dhPublicKey__": \{  

                "__expiry__": "2124\-11\-09T00:00:00\.000Z",  

                "__parameters__": "Curve25519/32byte random key",  

                "__keyValue__":  

"BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0D pA="  

            \},  

            "__nonce__": "0ka0stPfqmXWhX\+ODC/iOFMO0PXFdRjBdcEGbv55qqc="  

        \}  

    \}  

\}  

  

__ __ 

__Response Body:__ The table below illustrates the response body  

Response  

Code : 202 Accepted  

  

[image removed - see original document]  

# <a id="_7.3.2_Data_flow"></a>7\.3\.2 Data flow – call back to HIU 

This is the callback API for acknowledgment of Health information request of HIU\. CM calls this API when it has validated the Health Information request given the consent id\.  

Either the hiRequest or error would need to be specified\. If the health info request was valid, then the hiRequest\.transactionId specifies the transaction context against which HIP would send over the data\.  

__URL:__ \{callback\_url/api/v3/hiu/health\-information/on\-request  

__Request:__ POST  

__Header Parameters: __The table below illustrates the header  parameters  

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

Identifier of the health information user by which the request was initiated  

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

  

# <a id="_7.3.3_Data_flow"></a> 7\.3\.3 Data flow – Notify HIP

This API will be called by HIU and HIP to notify the CM about the status of the data transfer\.  

  

HIP on the transfer of data would send sessionStatus \- one of \[TRANSFERRED, FAILED\]\. HIP would also send hiStatus for each careContextReference \- on of \[DELIVERED, ERRORED\]  

  

HIU on receipt of data would send sessionStatus \- one of \[RECEIVED, FAILED\]\. For example, ERRORED when data was not sent or if invalid data was sent\. HIU would also send hiStatus for each careContextReference \- one of \[OK, ERRORED\]\.  

__URL:__ /api/hiecm/data\-flow/v3/health\-information/notify 

__Request:__  POST

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

"hipId": “HIP\_ID",  "statusResponses": \[\{ 

  	"careContextRefer 

ence": "9ec54c2f\-2f3541d6982846a93e83564e",  

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

    "notification": \{  

        "consentId": "97312afb\-c6a4\-483e\-8456\-5c9c96beb83f",  

        "transactionId": "97312afb\-c6a4\-483e\-8456\-5c9c96beb83f",  

        "doneAt": "2024\-08\-09T08:45:55\.984Z",  

        "notifier": \{  

            "type": " HIU",  

            "id": "HIU\_ID"  

        \},  

        "statusNotification": \{  

            "sessionStatus": "TRANSFERRED",  

            "hipId": "HIP\_ID",  

            "statusResponses": \[  

                \{  

                    "careContextReference": "9ec54c2f\-2f35\-41d6\-9828\-46a93e83564e",  

                    "hiStatus": "OK",  

                    "description": "Care Management"  

                \}  

            \]  

        \}  

    \} \}  

  

__Response Body__: The table below illustrates the response body  

Response  

[image removed - see original document]Code : 202 Accepted  

# <a id="_7.3.4_Data_flow"></a>7\.3\.4 Data flow – Notify HIU

This API will be called by HIU and HIP to notify the CM about the status of the data transfer\.  

  

HIP on the transfer of data would send sessionStatus \- one of \[TRANSFERRED, FAILED\]\. HIP would also send hiStatus for each careContextReference \- on of \[DELIVERED, ERRORED\]  

  

HIU on receipt of data would send sessionStatus \- one of \[RECEIVED, FAILED\]\. For example, ERRORED when data was not sent or if invalid data was sent\. HIU would also send hiStatus for each careContextReference \- one of \[OK, ERRORED\]\.  

__URL:__ /api/hiecm/data\-flow/v3/health\-information/notify 

__Request:__ POST 

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

"hipId": “HIP\_ID",  "statusResponses": \[\{ 

  	"careContextRefer 

ence": "9ec54c2f\-2f3541d6982846a93e83564e",  

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

    "notification": \{

        "consentId": "*\{\{consentId\}\}*",

        "transactionId": "*\{\{transactionId\}\}*",

        "doneAt": "2024\-12\-24T23:00:00\.000Z",

        "notifier": \{

            "type": "HIP",

            "id": "*\{\{hiu\-id\}\}*"

        \},

        "statusNotification": \{

            "sessionStatus": "RECEIVED",

            "hipId": "*\{\{hip\-id\}\}*",

            "statusResponses": \[

                \{

                    "careContextReference": "Test 10",

                    "hiStatus": "OK",

                    "description": "Care Management"\]\}

\}

  

__Response Body__: The table below illustrates the response body  

Response  

[image removed - see original document]Code : 202 Accepted  

# <a id="_7.3.5_Data_flow"></a>7\.3\.5 Data flow \- request status

This API endpoint allows Health Information Users \(HIU\) and Health Information Providers \(HIP\) to retrieve the status of a specific Health Information Request\. By providing the unique transaction ID, users can query the system to obtain real\-time updates on the processing state of their request\. This functionality is crucial for ensuring transparency and efficient communication between stakeholders in the health information exchange ecosystem\. The API supports various status checks, including pending, in\-progress, completed, and failed states\.

__URL:__ /api/hiecm/data\-flow/v3/health\-information/request/status/\{\{transactionId\}\}

__Request:__ GET  __ __ 

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

__Response Body__: The table below illustrates the response body  

Response  

[image removed - see original document]Code : 200 ok  

# 8 Subscription Flow

# <a id="_8.1_Overview"></a>8\.1 Overview

Health locker/PHR should initiate subscription requests so that it receives notifications/alerts whenever new information is available for the following categories\.  

1. LINK \- linking of a new Care\-context from HIPs against an ABHA address  
2. DATA \- availability of data against an existing care\-context from HIP\.  

While seeking subscription Health locker/PHR needs to use the Gateway Subscription APIs identifying itself as a Health locker/PHR\. Subscription will get auto approve for health locker for all HIPs and for all HI types  

Once user grants subscription to Health locker/PHR, the Health locker/PHR will be notified against the subscribed categories\.  

- 
	- If the subscription category is LINK \- Health locker/PHR should initiate a consent request for the notified care context\. Once the user grants the consent against the request, Health locker can initiate the data\-request\.  
	- In case subscription category is DATA \- then the Health locker/PHR should check if any existing consent request is available \(hiType and duration etc\.\) and use the same to initiate the data\-request\.  

# <a id="_8.2_Sequence_Diagram"></a>8\.2 <a id="OLE_LINK69"></a><a id="OLE_LINK70"></a>Sequence Diagram

# [image removed - see original document]

# [image removed - see original document]

# [image removed - see original document]

# <a id="_8.3_API_Information"></a>8\.3 API Information Request & Response   

# <a id="_8.3.1_Users_get"></a>8\.3\.1 Get all subscription requests for an ABHA Address\.  

This API endpoint is designed to be invoked by the patient or user through the Personal Health Record \(PHR\) application to fetch details of their subscription requests\. By using this API, patients can retrieve comprehensive information about all their subscription requests, including the status and specifics of each request\. 

__URL:__ /api/hiecm/subscription\-requests/v3/requests 

__Method:__ GET  

__Request Headers: __ 

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

__Body Parameters: __Not Applicable

__Request Body: __Not Applicable__ __

__Response: __  

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

# <a id="_8.3.2_User_subscription"></a>8\.3\.2 User subscription request initiate  

This API endpoint is designed to be invoked by Health Information Users \(HIUs\), patients, or users through the Personal Health Record \(PHR\) application to initiate a subscription request\. By using this API, individuals can start the process of subscribing to specific health information services or updates\. 

__URL:__ /api/hiecm/subscription\-requests/v3/init

__ Method:__ Post

 __Request Headers: __ 

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

X\-AUTHTOKEN  

Login Token  

Yes  

JWT Authentication token which was issued by ABDM after successful  validation of  

username and password  

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

Purpose of Use \- defines what is the purpose of use of the health information that a HIU is requesting for\. The following are subset from [http://terminology\.hl7\.org/ValueSet/v ](http://terminology.hl7.org/ValueSet/v3-PurposeOfUse)

[3\-PurposeOfUse  ](http://terminology.hl7.org/ValueSet/v3-PurposeOfUse)

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

                "type": "HIP"  

            \}  

\]  

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

            "id": "\{ Health locker/PHR ID\}"  

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

    \}  

\}  

__ __ 

__ __ 

__Response __ 

Response:__ __ 

Code: 202 Accepted\.   

  

# <a id="_8.3.3_User_subscription"></a>8\.3\.3 User subscription request initiate – Call Back  

This is the API which will be invoked by the health locker/PHR to initiate subscription request\.  

__URL:__ \{\{call back\}\}/api/v3/hiu/hiecm/subscription\-requests/on\-init 

__Method:__ Post 

__        __

__Request Headers: __ 

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

X\-AUTHTOKEN  

Login Token  

Yes  

JWT Authentication token which was issued by ABDM after successful  validation of  

username and password  

__Body parameters __ 

Property  

Name  

Example Value  

Required  

Description  

subscription Request  

  

\{  

    "id": "34c9b142\-8a2c\-4f4a\-

8d98c305dbdbbcbb"  

  \}  

  

  yes 

 Subscription request Id\. 

response  

  

\{  

    "requestId": "c8bd00d4\-58d1\-4d888b88a5f0c5817f06"  

  \}  

  

 Yes 

Request Id from init api\. 

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

  \}  

\}  

  

Code : 202 Accepted  

__ __ 

[image removed - see original document]__ __ 

# <a id="_8.3.4_Approve_Subscription"></a>8\.3\.4 Approve Subscription Request  

This Api will be invoked by the patient/user from PHR application to approve the subscription request raised by the health locker/PHR

__URL:__ /api/hiecm/subscription\- requests/v3/\{\{subscription\_requestid\}\}/approve  

__Method:__ Post

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

__Unique UUID for track the end to end request transaction __ 

TIMESTAMP  

2022\-10\-06T10:10:00\.587Z  

Yes  

Actual time when request was initiated, ISO Date time format represents date and 

time  

X\-CM\-ID  

sbx  

Yes  

Suffix of the consent manager to which the request was intended  

X\-

AUTHTOKEN  

Login JWT Token  

 Yes 

JWT Authentication token which was issued by ABDM 

after successful validation of username and password  

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

                "code": "CAREMGT",  

                "refUri":  

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

 Yes 

Categories available  

Period  

\{  

            "from": "2023\-04\- 

04T09:52:39\.235Z",  

            "to": "2023\-

0420T09:52:39\.235Z"  

        \}  

 yes 

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

Depending upon the flag selected as False or True, values need to be added  

__ __ 

__ __ 

__Request Body __ 

Request Body:__ __ 

\{  

    "isApplicableForAllHIPs": __false__,  

    "includedSources": \[  

        \{  

            "hiTypes": \[  

                "Prescription",  

                "DiagnosticReport",  

                "OPConsultation",  

                "DischargeSummary",  

                "ImmunizationRecord",  

                "HealthDocumentRecord",  

                "WellnessRecord" , 

              "Invoice" 

            \],  

            "purpose": \{  

                "text": "Care Management",  

                "code": "CAREMGT",  

                "refUri": "www\.abc\.com7"  

            \},  

            "hip": \{  

                "id": "HIP\_ID",  

                "name": "HIP\_NAME "  

            \},  

            "categories": \[  

                "DATA",  

                "LINK"  

            \],  

            "period": \{  

                "from": "2023\-04\-27T04:03:40\.079Z",  

                "to": "2023\-04\-27T04:03:40\.079Z"  

            \}  

        \}  

    \]  

\}            "LINK",  

"DATA"  

\],  

"period": \{  

"from": "2023\-04\-04T09:52:39\.235Z",  

"to": "2023\-04\-20T09:52:39\.235Z"  

\}  

\}  \],  

"excludedSources": \[  

        \{  

            "hiTypes": \[  

                "PRESCRIPTION"  

            \],       

       "purpose": \{  

                "text": "Self Requested",  

                "code": "PATRQT",  

                "refUri": "www\.test\.com"  

            \},  

__ __ 

__Response __ 

Response:__ __ 

\{  

    "subscriptionId": "b6c88154\-995b\-45b0\-b720\-838e357c8192",  

    "message": "Successfully approved Subscription request"  

\}  

Code: 202 Accepted  

  

# <a id="_8.3.5_Approve_Subscription"></a>8\.3\.5 Approve Subscription Request – Call Back

 This Api will be invoked by the patient/user from PHR application to approve the subscription request raised by the Health locker/PHR\.

__URL:__ \{\{callback\}\} /api/v3/hiu/subscription\-requests/hiu/notify 

__Method:__ Post 

__Request Headers: __ __ __ 

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

Actual time when request was initiated, ISO Date  

 

 

 

time format represents date and time  

X\-CM\-ID  

sbx  

 yes 

Suffix of the  consent manager to which the request was intended  

Authorizati on  

  

Gateway Session Token  

 yes 

ABDM Gateway  

Session Token  

X\-AUTHTOKEN  

Login Token  

Yes  

JWT Authentication token which was issued by ABDM after successful  validation of  

username and password  

__Body parameters __ 

Property Name  

Example Value  

Required  

Description  

SubscriptionRequestId  

  

"57ab7ec0\-ce1a\-4d408cc3\-

66172ac3f6ee",  

  

 Yes 

  

Subscription request ID 

Status  

GRANTED  

  

 Yes 

 Status: GRANTED, REVOKE, DENY\. 

Subscription  

  

\{  

      "id": "b6c88154\-995b\- 45b0\-b720\-838e357c8192",  

      "patient": \{  

        "id": "xxxxxxx@sbx"  

      \},    

 Yes 

Subscription id and abha address of the patient/user\. 

Hiu  

  

\{  

        "id": "HIP\_ID",  

        "name": "HIP\_NAME",  

        "type": "HIU"  

      \}    

 Yes 

 HIU details\. 

Sources  

  

\[  

        \{  

          "hip": \{\},  

          "categories": \[  

            "DATA",  

            "LINK"  

          \]    

 Yes 

 Sources contains HIP details and categories\. 

Period  

\{  

            "from": "2023\-04\- 

04T09:52:39\.235Z",  

            "to": "2023\-

0420T09:52:39\.235Z"  

        \}  

 Yes 

Period contains from date and to date\. 

__ __ 

__ __ 

__Response __ 

\{  

  "notification": \{  

    "subscriptionRequestId": "57ab7ec0\-ce1a\-4d40\-8cc3\-66172ac3f6ee",     "status": "GRANTED",      "subscription": \{  

      "id": "b6c88154\-995b\-45b0\-b720\-838e357c8192",  

      "patient": \{  

        "id": "xxxxxx@sbx"  

      \},  

      "hiu": \{  

        "id": "HIU\_ID",  

        "name": "HIU\-NAME",  

        "type": "HIU"  

      \},  

      "sources": \[  

        \{  

          "hip": \{\},  

          "categories": \[  

            "DATA",  

            "LINK"  

          \],  

          "period": \{  

            "from": "2024\-01\-09T09:00:00\.000Z",  

            "to": "2124\-12\-31T09:00:00\.000Z"  

          \}  

        \}  

      \]  

    \}  

  \}  

\}  

# <a id="_8.3.6_Subscription_Request"></a>[image removed - see original document]

# 8\.3\.6 Subscription Request HIU – on notify 

This is the API that will be invoked by the HIU to notify HIECM that HIU has raised the subscription request\.   

__URL:__ /api/hiecm/subscription\-requests/v3/hiu/on\-notify 

__Method:__ Post  

__Request Headers: __ 

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

X\-AUTHTOKEN  

Login Token  

Yes  

JWT Authentication token which was issued by ABDM after successful  validation of  

username and password  

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

 	1\.  	This is the  

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

  

# <a id="_8.3.7_Deny_Subscription"></a>8\.3\.7 Deny Subscription Request

This API will be invoked by the patient to deny the subscription request raised by the HIU  

__URL:__ /api/hiecm/subscriptionrequests/v3/\{\{subscription\_id\}\}/deny  

__Method__: Post  

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

Authorization  

Gateway Session Token  

Yes  

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

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

 Particular reason to deny the subscription\. 

	__Request Body __ 	 	 

Request Body:__ __ 

 	 

\{  	 	 

    "reason": "Not authorized"  

\}  

__ __ 

__ __ 

__ __ 

__Response __ 

Response:__ __ 

\{  

    "message": "Successfully denied the subscription request"  

\}  

202 Accepted  

# <a id="_8.3.8_Deny_Subscription"></a>8\.3\.8 Deny Subscription – Call Back

This is the API that will be invoked by the patient to deny the subscription request raise by the PHR  

__ URL:__ \{\{ call back\}\}/api/v3/hiu/subscription\-requests/hiu/notify 

__ Method:__ Post

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

Authorizati on  

  

Gateway Session Token  

  

ABDM Gateway Session Token  

X\-

AUTHTOKEN  

Login JWT Token  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password  

__ __ 

__ __ 

 

__ __ 

__Body parameters __ 

Property Name  

Example Value  

Required  

Description  

  

  

 Yes 

 It contains subscription request Id , reason and status\. 

notification  

  

\{  

    "subscriptionRequestId":  "5f3ed8a6\-7d1f\-48cbbbb0b87313798526",  

    "reason": "Not required",  

    "status": "DENIED"  

  \}  

  

  

__Response __ 

Response:__ __ 

\{  

    "notification": \{  

        "subscriptionRequestId": " 5f3ed8a6\-7d1f\-48cb\-bbb0\-b87313798526",         "reason": 

"Not authorized1",  

        "status": "DENIED"  

    \}  

\}  

202 Accepted  

[image removed - see original document]   

# <a id="_8.3.9_Edit_Subscription"></a>8\.3\.9 Edit Subscription 

This is the API that will be invoked by the patient/user from PHR application to edit date of the subscription\. Edit the subscription is required as user can change date range\. HIP/HI type can’t be edited\.

 

__URL:__ /api/hiecm/subscription\- requests/v3/patients/\{\{approved\_subscription\_id\}\}  

__Method:__ PUT 

__Request Headers: __ 

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

__  __ 

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

                    "code": "",          "refUri":  

"www\.amazon\.com"  

                \},       

Yes  

 

Hi types, purpose should be mentioned while editing the subscription\. 

There are 8 different hiTypes in  ABDM:  

Prescription  

DiagnosticReport  

OPConsultation  

DischargeSummary  

ImmunizationRecord  

HealthDocumentRecord 

WellnessRecord 

         Invoice 

Hip  

\{  

                    "id":  

"HIP\_ID",  

                    "name":  

"HIP\-NAME"                  \},    

Yes  

For which HIP requested was 

initiated  

  

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

 There are 8 different hiTypes in ABDM:  

Prescription  

DiagnosticReport  

OPConsultation  

DischargeSummary  

ImmunizationRecord  

HealthDocumentRecord 

WellnessRecord 

          Invoice 

 

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

\{

 

 

    

"

hiuId

": "HIU\_ID", 

 

    

"

subscriptionEditAndApprovalRequest

": \{ 

 

        

"

isApplicableForAllHIPs

": true, 

 

        

"

includedSources

": \[ 

 

            

\{

 

 

                

"

hiTypes

": \[ 

 

                    

"DiagnosticReport", 

 

                    

"Prescription", 

 

                    

"ImmunizationRecord", 

 

                    

"DischargeSummary", 

 

                    

"OPConsultation", 

 

                    

"HealthDocumentRecord", 

 

                    

"WellnessRecord" 

,

 

                  

"Invoice" 

 

                

, 

\]

 

                

"

purpose

": \{ 

 

                    

"

text

": "Care Management",                     

"

code

": "CAREMGT", 

 

                    

"

refUri

": "www\.abdm\.gov\.in" 

 

                

\}

, 

 

                

"

categories

": \[ 

 

                    

"DATA", 

 

                    

"LINK" 

 

                

\]

, 

 

                

"

period

": \{ 

 

                    

"from": "2024

\-

01

\-

09

T09:00:00\.000Z", 

 

                    

"to": "2123

\-

12

\-

31

T09:00:00\.000Z" 

 

                

 

\}

 

            

\}

 

 

        

\]

, 

 

        

"

excludedSources

": \[\] 

 

    

\}

 

 

\}

 

 

 

 

__Response __ 

Response:__ __ 

Code: 202 Accepted  

\{  

    "subscriptionId": "f9ca6ad7\-ba8f\-4257\-b7ad\-935a82a94480",      "message": "Successful creation of Subscriptions"  

\}  

  

### 	

# <a id="_8.3.10_Edit_Subscription"></a>8\.3\.10 Edit Subscription – Call Back

This is the API that will be invoked by the patient to deny the subscription request raise by the PHR health locker\.  

__URL:__ \{\{ call back\}\}/api/v3/hiu/subscription\-requests/hiu/notify  

__Method:__ Post  __ __

__Request Headers: __ 

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

 Yes 

ABDM Gateway Session Token  

X\-

AUTHTOKEN  

Login JWT Token  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password  

__ __ 

__ __ 

__Body parameters __ 

Property Name  

Example Value  

Required  

Description  

  

  

  

 It contains the subscription request Id, reason and status\. 

notification  

  

\{  

    "subscriptionRequestId":  "5f3ed8a6\-7d1f\-48cbbbb0b87313798526",  

    "reason": "Not required",  

    "status": "DENIED"  

  \}  

  

 Yes 

 

__Response __ 

Response:__ __ 

\{  

    "notification": \{  

        "subscriptionRequestId": " 5f3ed8a6\-7d1f\-48cb\-bbb0\-b87313798526",         "reason": 

"Not authorized1",  

        "status": "DENIED"  

    \}  

\}  

202 Accepted  

[image removed - see original document]   

# <a id="_8.3.11_Subscription_HIU"></a>8\.3\.11 Subscription HIU –notify  

This is the API that will be invoked by the health locker/PHR to notify by HIECM about the for link new record\.  

__URL:__ \{\{ call back\}\} /api/v3/hiu/subscription/notify  

__Method:__ POST  

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

X\-

AUTHTOKEN  

Login JWT Token  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password  

__Body Parameters:  __ 

Property Name  

Example Value  

Required  

Description  

Event \- 

SubscriptionRequestId  

  

"57ab7ec0\-ce1a\-4d408cc3\-

66172ac3f6ee",  

  

 Yes 

  

Subscription Request ID\. 

Event\-id  

17fb377f\-8675\-402f\-9c1b\- 

3e8857ef1fc8  

 yes 

 Event id\. 

Event\- published  

"2024\-08\-09 09:03:07\.059"  

 yes 

 Event published time 

Event\- category  

"LINK"  

  

  

Content\- patient  

\{  

        "id": "abha@sbx"  

      \}  

 Yes 

Abha address of the user 

Content\- hip  

\{  

        "id": "HIP\_ID"  

      \}  

 Yes 

 HIP id 

Content\- careContexts  

\[  

            \{  

              "patientReference":  

"xxxxxx@sbx",  

               

"careContextReference": 

"db4423d5\-62f7\-44f887d2\-

5fcb25c5a814"  

            \}  \}  

 Yes 

Care contexts of the patient 

Content\- hiTypes  

"Prescription"   

 Yes 

There are 8 different hiTypes in  ABDM:  

Prescription  

DiagnosticReport  

OPConsultation  

DischargeSummary  

ImmunizationRecord  

HealthDocumentRecord  

WellnessRecord 

          Invoice 

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

      \},  

      "contexts": \[  

 \{  

          "careContexts": \[  

            \{  

              "patientReference": "abah@sbx",  

              "careContextReference": "db4423d5\-62f7\-44f8\-87d2\-5fcb25c5a814"  

            \}  

          \],  

          "hiType": "Prescription"  

        \}  

      \]\}

\} 

  \}

[image removed - see original document][image removed - see original document]  

  

# 8\.3\.12 Subscription HIU – on notify  

This is the API that will be invoked to Health locker/PHR to notify HIECM about the link new record notification received\.  

__URL:__ /api/hiecm/subscription\-requests/v3/hiu/care\-context/on\-notify 

__Method:__ Post 

__Request Headers: __ 

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

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

X\-

AUTHTOKEN  

Login JWT Token  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password  

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

# <a id="_8.3.13_Get-all-Subscription-Request"></a><a id="_8.3.14_Subscription-details-by-Requ"></a><a id="_8.3.13_Subscription-details-by-Requ"></a>8\.3\.13 Subscription\-details\-by\-Request\-Id

This API endpoint is designed to fetch the user’s subscription details using the subscription request ID\.

__URL:__/api/hiecm/subscriptionrequests/v3/request/\{subscriptionRequestId\}

__Method:__ Get

__Request Headers: __ 

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

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

X\-

AUTHTOKEN  

Login JWT Token  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password  

__ __ 

__Body parameters __ / Path Variable

Property Name  

Example Value  

Required  

Description  

Subscription Request Id

ab1f0e59\-8388\-4698\-9fe6\-05db67aeac46

  

Yes  

The Subscription request Id

__ __ 

__Response __ 

Response:__ __ 

Code: 200 OK

\{

  "id": 1234,

  "requestId": "ab1f0e59\-8388\-4698\-9fe6\-05db67aeac46",

  "subscriptionId": "c12f0e59\-8388\-4698\-9fe6\-05db67aea3c4",

  "patientId": "sample@sbx",

  "requesterType": "phr",

  "status": "GRANTED",

  "details": \{

    "subscriptionRequestId": "38d8dbfc\-9ea6\-4f9f\-b807\-b00d2b885a54",

    "purpose": \{

      "text": "Care Management",

      "code": "CAREMGT",

      "refUri": "https://abc\.def\.in"

    \},

    "patient": \{

      "id": "radhikha@sbx"

    \},

    "hiu": \{

      "id": "INDIA\_HIU",

      "name": "INDIA HIU",

      "type": "HIU"

    \},

    "hips": \[

      \{

        "id": "INDIA\_HIP",

        "name": "INDIA HIP",

        "type": "HIP"

      \}

    \],

    "categories": \[

      "LINK"

    \],

    "period": \{

      "from": "2024\-05\-09T10:34:00\.389Z",

      "to": "2024\-05\-09T10:34:00\.389Z"

    \}

  \},

  "dateCreated": "2022\-10\-06T10:10:00\.587Z",

  "dateModified": "2022\-10\-06T10:10:00\.587Z",

  "healthIdNumber": "91\-7507\-6821\-7770"

\}

# <a id="_8.3.15_Subscription-details-by-Subs"></a><a id="_8.3.14_Subscription-details-by-Subs"></a>8\.3\.14 Subscription\-details\-by\-Subscription\-Id

This API endpoint is designed to fetch the user’s subscription details using the subscription ID\. 

__URL:__ /api/hiecm/subscription\-requests/v3/request/\{subscriptionId\}

__Method:__ Get

__Request Headers: __ 

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

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

X\-

AUTHTOKEN  

Login JWT Token  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password  

__ __ 

__Body parameters __ / Path Variable

Property Name  

Example Value  

Required  

Description  

Subscription Id

f29f0e59\-8388\-4698\-9fe6\-05db67aeac46

  

Yes  

The Subscription Id

__ __ 

__Response __ 

Response:__ __ 

Code: 200 OK

\{

  "subscriptionId": "f29f0e59\-8388\-4698\-9fe6\-05db67aeac46",

  "purpose": \{

    "text": "Care Management",

    "code": "CAREMGT",

    "refUri": "https://abc\.def\.in"

  \},

  "dateCreated": "2021\-09\-28T12:30:08\.573Z",

  "status": "GRANTED",

  "dateGranted": "2021\-09\-28T12:30:08\.573Z",

  "patient": \{

    "id": "radhikha@sbx"

  \},

  "requester": \{

    "id": "radhikha@sbx",

    "name": "ABDM\_HIU",

    "type": "HIU"

  \},

  "includedSources": \[

    \{

      "hip": \{

        "id": "INDIA\_HIP",

        "name": "INDIA HIP",

        "type": "HIP"

      \},

      "categories": \[

        "LINK"

      \],

      "hiTypes": \[

        "Prescription"

      \],

      "period": \{

        "from": "2024\-05\-09T10:34:00\.389Z",

        "to": "2024\-05\-09T10:34:00\.389Z"

      \},

      "status": "GRANTED"

    \}

  \]

\}

# <a id="_8.3.16_Patient-requests"></a>8\.3\.15 Get All Subscription Request

This API endpoint is used to retrieve all consent and subscription requests based on specified filters\. User can list of requests that match the given criteria, including details about their status, scope, and any associated conditions\.  

__URL:__ /api/hiecm/subscription\-requests/v3/patients/requests? consentOffset=0&subscriptionLimit=10&subscriptionOffset=0&status=ALL

__Method:__ Get

__Request Headers: __ 

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

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

X\-

AUTHTOKEN  

Login JWT Token  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password  

__ __ 

__Body parameters __

Property Name  

Example Value  

Required  

Description  

consentLimit

\-1

  

Yes  

to limit records being fetched

consentOffset

0

to skip the records before fetching the first record\.

subscriptionLimit

\-1

to limit records being fetched

subscriptionOffset

0

to skip the records before fetching the first record

status

All

The status of the subscription and consent

*Available values* : ALL, REQUESTED, DENIED, GRANTED, REVOKED, EXPIRED

__ __ 

__Response __ 

Response:__ __ 

Code: 200 OK

\{

  "consents": \{

    "size": 10,

    "limit": 10,

    "offset": 0,

    "requests": \[

      \{

        "requestId": "e5ec415f\-c098\-40f6\-a0db\-faa162fc5295",

        "createdAt": "2021\-09\-28T12:30:08\.573Z",

        "lastUpdated": "2021\-09\-28T12:30:08\.573Z",

        "status": "GRANTED",

        "purpose": \{

          "text": "Care Management",

          "code": "CAREMGT",

          "refUri": "www\.abc\.com"

        \},

        "patient": \{

          "id": "abdulkalam@abdm"

        \},

        "hip": \{

          "id": "cowin\_hip\_01",

          "name": "Cowin",

          "type": "HIP"

        \},

        "hiu": \{

          "id": "cowin\_hiu\_01",

          "name": "Cowin",

          "type": "HIU"

        \},

        "requester": \{

          "name": "abdulkalam@abdm",

          "identifier": \{

            "value": "REG1",

            "type": "MH1001",

            "system": "https://www\.sample\.com"

          \}

        \},

        "hiTypes": \[

          "Prescription"

        \],

        "careContexts": \[

          \{

            "patientReference": "batman@tmh",

            "careContextReference": "Episode1"

          \}

        \],

        "permission": \{

          "accessMode": "VIEW",

          "dateRange": \{

            "from": "2021\-09\-28T12:30:08\.573Z",

            "to": "2021\-09\-28T12:30:08\.573Z"

          \},

          "dataEraseAt": "2021\-09\-28T12:30:08\.573Z",

          "frequency": \{

            "unit": "HOUR",

            "value": 1,

            "repeats": 0

          \}

        \}

      \}

    \]

  \},

  "subscriptions": \{

    "limit": 5,

    "size": 0,

    "offset": 5,

    "requests": \[

      \{

        "id": "1234",

        "requestId": "f29f0e59\-8388\-4698\-9fe6\-05db67aeac46",

        "subscriptionId": "f29f0e59\-8388\-4698\-9fe6\-05db67aeac46",

        "patient": \{

          "id": "radhikha@sbx"

        \},

        "purpose": \{

          "text": "Care Management",

          "code": "CAREMGT",

          "refUri": "https://abc\.def\.in"

        \},

        "hiu": \{

          "id": "INDIA\_HIU",

          "name": "INDIA HIU",

          "type": "HIU"

        \},

        "hips": \[

          \{

            "id": "INDIA\_HIP",

            "name": "INDIA HIP",

            "type": "HIP"

          \}

        \],

        "categories": \[

          "LINK"

        \],

        "period": \{

          "from": "2024\-05\-09T10:34:00\.389Z",

          "to": "2024\-05\-09T10:34:00\.389Z"

        \},

        "createdAt": "2024\-05\-09T10:34:00\.389Z",

        "lastUpdated": "2024\-05\-09T10:34:00\.389Z",

        "status": "GRANTED",

        "requestType": "HEALTH\_LOCKER"

      \}

    \]

  \}

\}

# <a id="_8.3.17_patient-subscribed-lockers"></a><a id="_8.3.16_GET_Patient"></a>8\.3\.16 GET Patient Subscribed Lockers

This endpoint retrieves a list of health lockers associated with a given ABHA address\. It includes both active and inactive subscriptions based on the __includeInactive__ parameter\. 

__URL:__ /api/hiecm/subscription\-requests/v3/patients/lockers

__Method:__ Get

__Request Headers: __ 

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

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

X\-

AUTHTOKEN  

Login JWT Token  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password  

__ __ 

__Body parameters __

Property Name  

Example Value  

Required  

Description  

includeInactive

true

  

Yes  

Indicates whether to include inactive records

__ __ 

__Response __ 

Response:__ __ 

Code: 200 OK

\[

  \{

    "id": 212,

    "lockerId": "HIU\_V3",

    "lockerName": "HIU\_V3",

    "patientId": "sample@sbx",

    "dateCreated": "2024\-03\-15T01:49:16\.316Z",

    "dateModified": "2024\-03\-120T01:49:16\.316Z",

    "isActive": true

  \}

\]

# <a id="_8.3.18_patient-locker-details-by-lo"></a><a id="_8.3.17_patient-locker-details-by-lo"></a>8\.3\.17 patient\-locker\-details\-by\-locker\-id

This API endpoint is used to retrieve the health locker settings of a patient using the locker ID\. By invoking this API, users can access detailed information about the configuration and preferences of the patient’s health locker\.

__URL:__ /api/hiecm/subscription\-requests/v3/patients/lockers/\{locker\-id\}

__Method:__ Get

__Request Headers: __ 

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

X\-AUTH\-TOKEN

\{\{ X\-AUTH\-TOKEN \}\}  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password

Authorization  

Gatteway Session Token  

Yes  

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

__ __ 

__Body parameters __

Property Name  

Example Value  

Required  

Description  

locker\-id

1234

  

Yes  

The locker id

__ __ 

__Response __ 

Response:__ __ 

Code: 200 OK

\{

  "lockerId": "1234",

  "lockerName": "Locker 1",

  "active": true,

  "dateCreated": "2021\-09\-28T12:30:08\.573Z",

  "subscriptions": \[

    \{

      "subscriptionId": "f29f0e59\-8388\-4698\-9fe6\-05db67aeac46",

      "purpose": \{

        "text": "Care Management",

        "code": "CAREMGT",

        "refUri": "https://abc\.def\.in"

      \},

      "status": "GRANTED",

      "dateCreated": "2021\-09\-28T12:30:08\.573Z",

      "dateGranted": "2021\-09\-28T12:30:08\.573Z",

      "patient": \{

        "id": "radhikha@sbx"

      \},

      "requester": \{

        "id": "radhikha@sbx",

        "name": "ABDM\_HIU",

        "type": "HIU"

      \},

      "includedSources": \[

        \{

          "hiTypes": \[

            "Prescription"

          \],

          "purpose": \{

            "text": "Care Management",

            "code": "CAREMGT",

            "refUri": "https://abc\.def\.in"

          \},

          "hip": \{

            "id": "INDIA\_HIP",

            "name": "INDIA HIP",

            "type": "HIP"

          \},

          "categories": \[

            "LINK"

          \],

          "period": \{

            "from": "2024\-05\-09T10:34:00\.389Z",

            "to": "2024\-05\-09T10:34:00\.389Z"

          \},

          "status": "SUCCESS"

        \}

      \]

    \}

  \],

  "autoApprovals": \[

    \{

      "id": 1234,

      "autoApprovalId": "e5ec415f\-c098\-40f6\-a0db\-faa162fc5295",

      "hiuId": "India\_HIU",

      "patientId": "sample@sbx",

      "isActive": false,

      "dateCreated": "2021\-09\-28T12:30:08\.573Z",

      "dateModified": "2021\-09\-28T12:30:08\.573Z",

      "policy": \{

        "isApplicableForAllHIPs": true,

        "hiu": \{

          "id": "INDIA\_HIU",

          "name": "INDIA HIU",

          "type": "HIU"

        \},

        "includedSources": \[

          \{

            "hiTypes": \[

              "Prescription"

            \],

            "purpose": \{

              "text": "Care Management",

              "code": "CAREMGT",

              "refUri": "https://abc\.def\.in"

            \},

            "hip": \{

              "id": "INDIA\_HIP",

              "name": "INDIA HIP",

              "type": "HIP"

            \},

            "categories": \[

              "LINK"

            \],

            "period": \{

              "from": "2024\-05\-09T10:34:00\.389Z",

              "to": "2024\-05\-09T10:34:00\.389Z"

            \},

            "status": "SUCCESS"

          \}

        \],

        "excludedSources": \[

          \{

            "hiTypes": \[

              "Prescription"

            \],

            "purpose": \{

              "text": "Care Management",

              "code": "CAREMGT",

              "refUri": "https://abc\.def\.in"

            \},

            "hip": \{

              "id": "INDIA\_HIP",

              "name": "INDIA HIP",

              "type": "HIP"

            \},

            "categories": \[

              "LINK"

            \],

            "period": \{

              "from": "2024\-05\-09T10:34:00\.389Z",

              "to": "2024\-05\-09T10:34:00\.389Z"

            \},

            "status": "SUCCESS"

          \}

        \]

      \}

    \}

  \]

\}

# <a id="_9_HIP_Initiated"></a><a id="_8.3.18_Setup_Locker"></a>8\.3\.18 Setup Locker

This API endpoint is used to set up a health locker for a patient\. By invoking this API, users can configure a secure storage space for the patient’s health records, ensuring that all health information is organized and easily accessible\. This functionality is essential for managing and safeguarding health data, providing patients with a centralized location for their medical documents\.

__URL:__ /api/hiecm/subscription\-requests/v3/setup\-locker

__Method:__ POST

__Request Headers: __ 

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

X\-AUTH\-TOKEN

\{\{ X\-AUTH\-TOKEN \}\}  

Yes  

JWT Authentication token which was issued by ABDM after successful validation of username and password

Authorization  

Gatteway Session Token  

Yes  

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

X\-LOCKER\-ID

X\-LOCKER\-ID

Yes

The __X\-LOCKER\-ID__ is a unique identifier used within the Ayushman Bharat Digital Mission \(ABDM\) project to facilitate secure and efficient management of health records\.

__ __ 

__Response __ 

Response:__ __ 

Code: 200 OK

\{

  "consentAutoApprovalId": "e5ec415f\-c098\-40f6\-a0db\-faa162fc5295"

\}

# 9 HIP Initiated Linking

# <a id="_9.1_Overview"></a>9\.1 Overview

HIP\-initiated linking is the process through which a HIP links the patient’s care context \(health record\) with the patient's ABHA Address, after patient registration and creation of health records \(in their HMIS/LMIS system\)\.   

Care context \(Health record\) linking happens in two steps\.  

- Link token generation  
- Linking care context with ABHA address after obtaining a valid link token         

  

__Link token generation __ 

To achieve linking, the HIPs need to have a valid link token using link token service  

The link token will be used for linking the ‘n’ number of care contexts, and concurrent linkages\.  

# <a id="_9.2_Sequence_Diagram"></a>9\.2 Sequence Diagram

# [image removed - see original document]

# [image removed - see original document]

# <a id="_9.3_List_of"></a>9\.3 List of API

# <a id="_9.3.1_Link_token"></a>9\.3\.1 <a id="_Hlk196407703"></a>Link token generation  

This API invoked by HIP or HRP to generate a link token\.  

__URL:__ /api/hiecm/v3/token/generate\-token 

__Method:__ POST

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

Unique UUID for tracking the end\-toend request transaction  

TIMESTAMP  

2022\-10\-06T10:10:00\.587Z  

Yes  

The actual time when the request was initiated, ISO Date time format represents the date and time  

Authorization  

Token  

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

Example Value  

Required  

Description  

abhaAddress  

“ABHA address”  

Yes  

Patient ABHA address against which the health records need to be linked\.  

abhaNumber  

ABHA number  

Yes \(if ABHA address have linked ABHA number then its required otherwise not required\)  

14\-digit unique ABHA number of the patient\.  

Name  

“Full name”  

Yes  

Patient's full name in the following format  First Name | Middle Name | Last Name  

Gender  

“M”/”F”/”T”  

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

    "name": "Arjun",  

    "gender": "M",  

    "yearOfBirth": XXXX  

\}  

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

    \}  

\]  

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

\{  

    "code": "ABDM\-1030: ",  

    "message": "Invalid request ID"  

\}  

Code: 400Bad Request   

   

When Timestamp is  

Blank, null or empty in header\.   

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

  

\{  

    "code": "ABDM\-1016: ",  

    "message": "Invalid Timestamp"  

\}  

  

Code \- 400Bad Request  

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

When invalid  

Timestamp is pass in  header  

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "*\{\{$isoTimestamp\}\}*jh gftytgtyu",  

        "type": "text"  

    \}  

\]  

When X\-HIP\-ID is Blank, null or empty in header\.    

\[  

    \{  

        "key": "X\-HIP\-ID",  

        "value": "",  

        "type": "text"  

    \}  

\]  

When X\-CM\-ID is  

Invalid, Blank, null or empty in header\.   

\[  

    \{  

        "key": "X\-CM\-ID",  

        "value": "sbxdvdfvdf",  

        "type": "text"  

    \}  

\]  

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

  

 ABHA number and ABHA address cannot be null  

 \{  

    "abhaNumber": __null__,  

    "abhaAddress": __null__,  

    "name": "Mayur Bapu",  

    "gender": "M",  

    "yearOfBirth": XXXX \}  

\{  

    "abhaNumber": 911783861017XXX,  

    "abhaAddress": "91178386101731X 

XXX@sbx",  

    "name": "Mayur M ",  

    "gender": "M",  

    "yearOfBirth": XXXX \}  

\{  

    "code": "ABDM\-1125",  

    "message": "ABHA number and ABH 

A address cannot be null"  

\}  

  

Code \- 400Bad Request  

  

  

  

\[  

    \{  

        "code": "ABDM\-9999: ",  

        "message": "Invalid ABHA Number, it must be only 14 digit"  

    \}  

\]  

  

Code \- 400Bad Request  

  

\[  

    \{  

        "code": "ABDM\-9999: ",  

        "message": "Invalid ABHA Address,  it must start with Alphanumeric \. and  \_  in the middle and must be ending  with @abdm or @sbx"  

    \}  

\]  

  

Code \- 400Bad Request  

  

 Callback: \{  

    "error": \{  

        "code": "ABDM\-1207: ",  

        "message": 	"Demographic 	details 	was invalid or doesn't exists"  

    \},  

    "response": \{  

        "requestId": "58f080de\-b5444bcf\-8f4b\-

3d45222b2885"  

    \}  

\}    

Code\- 202Accepted  

  

   

When passing an abha number of more or less than 

14 digits  

 When passing invalid abha address/Invalid domain\.  

\{  

    "abhaNumber": 91178386109XXXX 

,  

    "abhaAddress": "9117838610XXX@ gmail\.com",  

    "name": "Mayur M",  

    "gender": "M",  

    "yearOfBirth": 1994 \}  

 When passing invalid  

Name  

 \{  

    "abhaNumber": 	9117838610XXXX, 

"abhaAddress": "911783861XXXX@ sbx",  

    "name": "Mferr",  

    "gender": "M",  

    "yearOfBirth": 1994  

\}  

  

 

When passing invalid  

Gender except M, F, O,  

D  

\{  

    "abhaNumber": 9117838610XXXX,  

    "abhaAddress": "9117838610XXXX 

@sbx",  

    "name": "Mayur B ",  

    "gender": "W",  

    "yearOfBirth": XXXX \}  

\{  

    "abhaNumber": 	9117838610XXX, 

"abhaAddress": "9117838610XXX@ sbx",  

    "name": "Mayur B",  

    "gender": "M",  

    "yearOfBirth": XX  

\}  

\[  

    \{  

        "code": "ABDM\-9999: ",  

        "message": "Invalid Gender, It mus t be M, 

F, O, D"  

    \}  

\]  

  

Code\- 400Bad Request  

\[  

    \{  

        "code": "ABDM\-9999: ",  

        "message": "Invalid Year of birth, must be 

4 digit range between 1900 a nd 2200"  

    \}  

\]  

  

Code\- 400Bad Request  

Callback: \{  

    "error": \{  

        "code": "ABDM\-1207: ",  

        "message": "Demographic details was invalid or doesn't exists"  

    \},  

    "response": \{  

        "requestId": "89d2dcb4\-06a545fa\-8910\-

417d6e83bdd5"  

    \}  

\}  

  

Code\- 202Accepted  

Callback: \{  

    "error": \{  

        "code": "ABDM\-1207: ",  

        "message": "Demographic details was invalid or doesn't exists"  

    \},  

    "response": \{  

        "requestId": "58f080de\-b5444bcf\-8f4b\-

3d45222b2885"  

    \}  

\}  

  

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

    "abhaAddress": "9117838610XXXX @sbx",  

 

    "name": "Mayur B ",  

    "gender": "F",  

    "yearOfBirth": XXXX \}  

        "message": "Demographic details was invalid or doesn't exists"  

    \},  

    "response": \{  

        "requestId": "58f080de\-b5444bcf\-8f4b\-

3d45222b2885"  

    \}  

\}  

  

Code\- 202Accepted  

Callback: \{  

    "error": \{  

        "code": "ABDM\-1207: ",  

        "message": "Demographic details was invalid or doesn't exists"  

    \},  

    "response": \{  

        "requestId": "89d2dcb4\-06a545fa\-8910\-

417d6e83bdd5"  

    \}  

\}  

  

Code\- 202Accepted  

Callback: \{  

    "abhaAddress": "91178386101731@sbx 

",  

    "error": \{  

        "code": "ABDM\-1027: ",  

        "message": "You are blocked\. Plea se try again after 24 hours\."  

    \},  

    "response": \{  

        "requestId": "ddcd6213\-49e24d46\-ad44\-

07897c63c36b"  

    \}  

\}  

When abha Address is passing of another’s user\.  

  

\{  

    "abhaNumber": 9117838610XXXX,  

    "abhaAddress": "9117838610XXXX  

@sbx",  

    "name": "Mayur B",  

    "gender": "F",  

    "yearOfBirth": XXXX  

\}  

  

When the user tries to generate a link token more than 3 times  

\{  

    "abhaNumber": 9117838610XXXX,  

    "abhaAddress": "9117838610XXXX  

@sbx",  

    "name": "Mayur B",  

    "gender": "M",  

    "yearOfBirth": XXXX  

\}  

  

# <a id="_9.3.2_Link_token"></a>9\.3\.2 Link token generation – Call Back API  

This is a callback API triggered by HIE\-CM to HIP/HRP to get the link token\. 

 

__URL:__ \{callback\_url\}/api/v3/hip/token/on\-generate\-token  

__Method:__ POST  

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

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoYWt1bWFyLmtlc2F2  

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

04MDgxLWY1OTM0MWVkNGNkNSIsImFiaGFB 

Yes  

Patient full name:   

First Name |  

Middle Name |  

Last Name  

 

ZGRyZXNzIjoiMTAwMDAyNjIxMzE2NDBAYWJk bSJ9\.q\- p8eHxdacvSg2QPzm7vY7\_kLHYCQXwkbkAc EvSwcp5HFAdtUyNoZ50LyquQih2Lbxv0Dxm 

Da3YxyMnQY37GJsBpcs\- 

4OQmUk5tvoad1HYGjBVMlq0tVae7gpFHno nSSyhkVPGLTO5G4tvghvcK8xcMqoQol\_lmR 

26VIGCue07nx6K4xPueUOQeeqKMXPJs115wPunafT3LT24 k9KEHzbmDcWDJjUouBZ4TKAXcGrfwOuhG 

M0eWr\- 

SMZ99PAlTHxHCZnJybUWL9E2MH6bpq87wD hFPrq0WLzhLJhynnfaWxrd7JkFdUtDygkpaiR h3V12xVqx8eWaSwxdwvCLut4A  

 

 

requestId  

d6d6d056\-666a\-4af8\-b6804c61bcb29dd4  

Yes  

Unique UUID to track the  endtoend flow  

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

    \}  

\}  

__ __ 

__Response Body __ 

__  	  	 __ 

Response__ __ 

Code : 202 Accepted   

__ __ 

[image removed - see original document]__ __ 

__ __ 

__Error Scenarios: __ 

__Scenario __ 

__Headers/Body __ 

__Message __ 

When Request ID  

is Blank, null or  empty in header  

\[  

    \{  

        "key": "REQUEST\-ID",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied  

Code : 403 Forbidden   

  

  

  

When invalid Request\-

ID is pass in header   

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

Code: 400Bad Request  

When Timestamp  

is Blank, null or empty in header\.   

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

When invalid 

Timestamp is pass in header  

\[  

    \{  

        "key": "TIMESTAMP",  

\{  

    "code": "ABDM\-1016: ",  

    "message": "Invalid Timestamp"  

\}  

 

 

        "value": "*\{\{$isoTimestamp\}\}*jhgftyt gtyu",  

        "type": "text"  

    \}  

\]  

Code \- 400Bad Request  

  

When X\-HIP\-ID is Blank, null or empty in header\.    

\[  

    \{  

        "key": "X\-HIP\-ID",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

  

When X\-CM\-ID is  

Invalid, Blank, null, or empty in the header\.   

\[  

    \{  

        "key": "X\-CM\-ID",  

        "value": "sbxdvdfvdf",  

        "type": "text"  

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

When X\-LINKTOKEN is Blank, null, or empty in the header\.  

\[  

    \{  

        "key": "X\-LINK\-TOKEN",  

        "value": "",  

        "type": "text"  

    \}  

\]  

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

    \}  

\]  

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

        "value": "eyJhbGciOiJSUzUYr9LtA5 

A",  

        "type": "text"  

    \}  \]  

\{  

    "code": "ABDM\-1063",  

    "message": "HIP Id mismatch with  

Link token"  

\}  

   

Code \- 400Bad Request  

  

 

When passing the Link Token of another user in the header  

\[  

    \{  

        "key": "X\-LINK\-TOKEN",  

        "value": "eyJhbGciOiJSUzUxMiJ9\.ey JoaXBJZCI6IlN1YzTlcJDFRfSAhPZxRpAr mlevBdVt4rLk\- 

EkCRGfLmFqizijYO7z\_pdasi35fG6dknrNDQb1vf\- 0o0ggQHOyjhD2aJLBDGjSKsAOidU9qS usEjBC6j4HU3uZjyFPMQjg",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1038",  

    "message": "ABHA address misma tch with Link token"  

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

    "abhaNumber": "91178386101731",  

    "abhaAddress": "91178386101731@sbx" 

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

    \]  

\}  

  

\{  

    "code": "ABDM\-1090",  

    "message": "Duplicate HIP link req uest"  

\}   

When Abha Number 

is mismatch with  

Link Token  

\{  

    "abhaNumber": "11111111111111",  

    "abhaAddress": "91178386101731@sbx" 

,  

    "patient": \[  

        \{  

            "referenceNumber": "Mayur C",  

\{  

    "code": "ABDM\-1062",  

    "message": "ABHA number misma tch with Link token"  

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

    \]  

\}  

  

 

When Abha Number 

is mismatch with  

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

    "message": "ABHA address misma tch with Link token"  

\}    

Code \- 400Bad Request  

If care context is null  

\{  

    "abhaNumber": "91178386101731",  

    "abhaAddress": "91178386101731@sbx" 

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

    \}  

\]  

  

Code \- 400Bad Request  

   

 

        \}  

    \]  

\}  

  

 

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

    \}  

\]  

  

Code \- 400Bad Request  

   

If count is not matching with Care 

Context count  

\{  

    "abhaNumber": "91178386101731",  

    "abhaAddress": "91178386101731@sbx" 

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

        "code": "ABDM\-1037: ",          "message": "Count and Care co ntext count mismatch"  

    \},  

    "response": \{  

        "requestId": "ab00fdec\-fc804502\-b1bc\-

121be6808a9f"  

    \}  

\}  

  

Code \- 202Accepted  

  

  

# <a id="_9.3.3_Linking_care"></a>9\.3\.3 Linking care context  

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

Token  

Yes  

JWT Access token which was issued  

by ABDM 

session API after successful validation of client id and secret\.  

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

\{\{X\-Link\-Token\}\}

Yes  

Link token generated against 

patient 

ABHA 

address and/or ABHA number\.  

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

  \}  

\]  

Yes  

Care context is the patient individual health record\.  

hiType  

“PRESCRIPTION”  

Yes  

There are 8 different hiTypes in ABDM:  

Prescription  

DiagnosticReport  

OPConsultation  

DischargeSummary  

ImmunizationRecord  

HealthDocumentRecord  

WellnessRecord 

Invoice 

count  

1  

Yes  

Number of health records in the careContext object  

__Request Body:__    

Request Body  

\{  

    "abhaNumber": 9117838610XXXX,  

    "abhaAddress": "abc@abdm",  

patient": \[  

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

\]

\}

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

When an invalid Request ID is

passed in the header   

\[\{"key":"REQUEST\- 

 

ID","value":"\{\{$guid\}\}zxzzxs"," type":"text"\}\]  

\{  

    "code": "ABDM\-1030: ",  

    "message": "Invalid request  

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

\{$isoTimestamp\}\}jhgftytgty u","type":"text"\}\]  

\{  

    "code": "ABDM\-1016: ",  

    "message": "Invalid  

Timestamp"  

\}  

   

Code \- 400Bad Request  

 

When X\-HIP\-ID is Blank, null, or empty in the header\.    

\[\{"key":"X\-HIP\- 

ID","value":"","type":"text"\}\]  

Access Denied   

Code: 403 Forbidden   

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

TOKEN”\}\]

 

\{  

    "code": "ABDM\-1038",     "message": "ABHA address  mismatch with Link token"  

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

    "code": "ABDM\-1090",     "message": "Duplicate HIP link request"  

\}  

     

 

 

            "display":  

"Apollo\_Encounter\_123\_20230 

70414",  

            "careContexts": \[  

                \{  

                    "referenceNumber":  

"Health Document Reference  Number",  

                    "display": "Sugar  

Test"  

                \}  

            \],  

            "hiType": "PRESCRIPTION",  

            "count": 1  

        \}  

    \]  \}  

   

   

   

   

   

   

   

   

   

   

   

   

   

   

When Abha Number is mismatch with Link Token  

\{  

    "abhaNumber": "11111111111111",     "abhaAddress":  

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

    \]  

\}  

\{  

    "code": "ABDM\-1062",     "message": "ABHA number  mismatch with Link token"  

\}  

     

   

   

   

   

   

   

   

   

   

   

   

   

  

   

   

\{  

  

Empty patient details in the request  

\{  

    "abhaNumber": 12345678901 

234,  

    "abhaAddress": "abc@abdm" 

,  

    "patient": \[\]  

\}  

\{  

  "code": "ABDM\-1115",    "message": "Invalid patient information\. At least one patient information is required\."  

\}   

Trying to link a record for a deleted abha address  

\{  

    "abhaNumber": "91178386101731",     "abhaAddress":  

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

    \]  

\}  

\{  

  "code": "ABDM\-1031",   "message": 

"The abha  address is deactivated\."  

\}  

  

# <a id="_9.3.4_Linking_care"></a>  9\.3\.4 Linking care context Call back API 

This is a callback API triggered by HIE\-CM to notify HIP/HRP about linked care context response\.  

__URL:__ \{callback\_url\}/api/v3/link/on\_carecontext  

__Request:__ POST  

__ __ 

__ __ 

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

Token  

Yes  

JWT Access token which was issued by ABDM session API after successful validation of client id and secret  

__ __ 

__ __ 

__ __ 

__ __ 

__ __ 

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

Patient ABHA address against which the health records need to be linked  

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

  

# <a id="_9.3.5_GET_All"></a> 9\.3\.5 GET All Link records

This API provide all the linked care contexts for ABHA Address\.  

__URL: __/api/hiecm/hip/v3/link/patient/links 

__Request: __GET 

__ __ 

__Header Parameters: __  

Property  

Name  

Example Value  

Required  

Description  

Authorization   

Token  

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

The actual time when the request was 

initiated, ISO Date time format represents the date and time  

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

To verify when  

Request ID is Blank, null or empty in header  

\[  

    \{  

        "key": "REQUEST\-ID",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

  

 

\[  

\{  

To verify when invalid RequestID is pass in header   

    \{  

        "key": "REQUEST\-ID",  

        "value": "*\{\{$guid\}\}*zxzzxs",  

        "type": "text"  

    \}  

\]  

    "code": "ABDM\-1030: ",     

"message": "Invalid reque st ID"  

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

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

  

  

When invalid Timestamp is pass 

in header  

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1016: ",     "message": "Invalid Times tamp"  

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

When X\-Auth\- 

TOKEN is Invalid in header\.  

\[  

    \{  

        "key": "X\-AUTH\-TOKEN",  

        "value": "hghhjjkhjkbkjbjkbkjbnkjbk",  

        "type": "text"  

    \}  

\]  

\{  

    ""code"": ""ABDM\-1065: "",  

    ""message"": "" Invalid X  

Auth token""  

\}  

  

Code \- 400Bad Request"  

__ __ 

__ __ 

__ __ 

__ __ 

__ __ 

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

                    "type": "HIP"  

                \},  

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

__ __ 

# <a id="_9.3.6_Notify_care"></a>9\.3\.6 Notify care context Update

This API will be invoked by HIP after updating a health record to notify all the subscribed HIUs\.  

__URL: __/api/hiecm/hip/v3/link/context/notify 

__Request: __POST  

__ __ 

__Header Parameters: __  

Property  

Name  

Example Value  

Required  

Description  

Authorization   

Token  

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

The actual time when the request was 

initiated, ISO Date time format represents the date and time  

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

There are 8 different hiTypes in ABDM:  

Prescription  

DiagnosticReport  

OPConsultation  

DischargeSummary  

ImmunizationRecord  

HealthDocumentRecord  

WellnessRecord 

Invoice 

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

__ __ 

__ __ 

__ __ 

__ __ 

__ __ 

__Error scenarios: __ 

  

Scenarios  

Headers/Body  

Message  

To verify when  

Request ID is Blank, null or empty in header  

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

        "value": "*\{\{$guid\}\}*zxzzxs",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1030: ",     

"message": "Invalid requ est ID"  

\}  

   

 Code: 400Bad Request   

  

When invalid Timestamp is pass 

in header  

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",  

        "type": "text"  

    \}  

\]  

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

ID"  

\}  

  

__Response Body:__   

Response  

Code : 202 Accepted   

  

Call back HIU  

__ __ 

All the HIUs who are subscribed will be notified about the linkage of care contexts\.  

# <a id="_9.3.7_Call_back"></a>9\.3\.7 Call back API for notify care context update  

This is a callback API triggered by HIE\-CM to notify HIP/HRP about care context update response\.

  

__URL: __\{callbackURL\}/api/v3/links/context/on\-notify 

__Request: __POST  

__Header Parameters: __  

Property  

Name  

Example Value  

Required  

Description  

Authorization   

Token  

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

  

18235d89\-cb13\-479dad717a57d5f669a8   

  

Yes   

Unique UUID for tracking the end\-toend request transaction   

timestamp  

  

2023  \-03\-09T07:07:41\.793Z  

Yes   

The actual UTC time when the request was initiated, ISO Date time format represents the date and time  

acknowledgement 

  

 " acknowledgement": \{  

      “status": “SUCCESS"  

    \}  

Yes  

Status of the  

/api/hiecm/hip/v3/link/context/notify API call\.  

error  

  

"error": \{  

    "code": "ABDM\-1024",  

    "message": "Dependent service unavailable"  

  \}  

No  

The error code and message if the notify request is failed\.  

response  

  

“response“: \{  

  “requestId”: “18235d89\-cb13\- 479d\-ad71\-7a57d5f6656a”  

\}  

Yes  

requestId from the  

/api/hiecm/hip/v3/link/context/notify API call 

  

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

__Response Body:__   

Response  

Code : 202 Accepted   

__ __ 

[image removed - see original document]__ __ 

__ __ 

# <a id="_9.3.8_SMS_Notification"></a>9\.3\.8 SMS Notification to patients  

This API will be invoked by HIP to trigger a SMS notification to the patient mobile number when health record is available to fetch\.  

  

__URL: __/api/hiecm/hip/v3/link/patient/links/sms/notify2

 __Request: __POST  

__ __ 

__Header Parameters: __  

Property  

Name  

Example Value  

Required  

Description  

Authorization   

Token  

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

The actual time when the request was 

initiated, ISO Date time format represents the date and time  

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

__ __ 

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

  \}  

\}  

__ __ 

__Error scenarios: __ 

  

Scenarios  

Headers/Body  

Message  

To verify when  Request ID is Blank, 

null or  

empty in   

  

header  

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

        "value": "*\{\{$guid\}\}*zxzzxs",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1030: ",     

"message": "Invalid requ est ID"  

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

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

  

  

When invalid 

Timestamp is pass in header  

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",  

        "type": "text"  

    \}  

\]  

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

        "type": "text"  

    \}  

\]   

Access Denied   

Code : 403 Forbidden   

When given HIP id does not exist\.  

  

\{  

    "code": "ABDM\-1035: ",  

    "message": "Invalid HIP  

ID"  

\}  

  

__Response Body:__   

Response  

Code : 202 Accepted   

__ __ 

# <a id="_9.3.9_Callback_API"></a>9\.3\.9 Callback API for SMS Notification to patients  

This is a callback API triggered by HIE\-CM to notify HIP/HRP about SMS notification response\.  

__URL: __\{callbackURL\}/api/v3/patients/sms/on\-notify 

__Request: __POST  

__Header Parameters: __  

Property  

Name  

Example Value  

Required  

Description  

Authorization   

Token  

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

  

18235d89\-cb13\-479dad717a57d5f669a8   

  

Yes   

Unique UUID for tracking the end\-to\-end request transaction   

timestamp  

  

2023  	\-03\-09T07:07:41\.793Z

Yes   

The actual UTC time when the request was initiated, ISO Date time format represents the date and time  

status  

“status": “SUCCESS"  

Yes  

Status of the  

/hiecm/api/v3/link/patient/links/sms/notify2 API call\.  

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

/hiecm/api/v3/link/patient/links/sms/notify2 API call\.  

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

  \}  

\}  

__ __ 

__Response Body:__   

Response  

Code : 202 Accepted   

  

[image removed - see original document]  

  

# 10 User Initiated Linking

# <a id="_10.1_Overview"></a>10\.1 Overview

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

  

# <a id="_10.2_Sequence_Diagram"></a>10\.2 Sequence Diagram

# [image removed - see original document]

# [image removed - see original document]

# <a id="_10.3_List_of"></a>10\.3 List of API

# <a id="_10.3.1_Patient_Health"></a>10\.3\.1 Patient Health record discovery 

This API will be invoked by the patient/user from the PHR application to HIECM to discover his/her health records\.  

__URL:__ /api/hiecm/user\-initiated\-linking/v3/patient/care\-context/discover 

__Request:__ POST  

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

ZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJ Nb2JpbGUiOm51bGwsImV4c  

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

The actual time when the request was 

initiated, ISO Date time format represents the date and time  

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

To verify when  

Request ID is Blank, null or empty in header  

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

        "value": "*\{\{$guid\}\}*zxzzxs",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1030: ",     

"message": "Invalid reque st ID"  

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

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

  

  

When invalid 

Timestamp is pass in header  

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "*\{\{$isoTimestamp\}\}*jhgftytgtyu",  

        "type": "text"  

    \}  

\]  

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

    \}  

\]  

  

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

    \}  

\]  

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

    \]  

\}  

\{  

    "code": "ABDM\-9999: ",     "message": "HIP ID is mandatory"  

\}   

When X\-HIU\-ID and the hipId in the payload is same\.  

  

  

\{  

    ""code"": ""ABDM\-1031  

: "",  

    ""message"": HIP and HIU  cannot be same""  

\}  

  

Code \- 400Bad Request"  

When duplicate request payload is sent\.  

  

  

\{  

    "code": "ABDM\-1103: ",  

    ""message"": “Duplicate  

Discovery request“  

\}  

  

Code \- 400Bad Request"  

# <a id="_10.3.2_HIE-CM_callback"></a>10\.3\.2 HIE\-CM callback to HIP \- Discovery  

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

__ __ __Body Parameters: __ 

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

Identifiers using HIP will search the patient information in their records\.  

YearOfBirth

XXXX

Yes

Year of Birth the patient

Request Body:

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

    \}  

\}  

__Response:__

__  __

Response 

Code: 200 OK 

  

[image removed - see original document]  

  

  

# <a id="_10.3.3_HMIS/LMIS_response"></a>10\.3\.3 HMIS/LMIS response on health record discover  

This API will be invoked by the __HMIS/LIMS application__ for sharing the response of discover request\.  

__URL:__ /api/hiecm/user\-initiated\-linking/v3/patient/care\-context/on\-discover  

__Request:__ POST  

__ __ 

__Header Parameters: __  

Property  

Name  

Example Value  

Required  

Description  

Authorization   

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhbnRoY Wt1bWFyLmtlc2F2YW5Ac2J4IiwiY2xpZW50SWQiOi 

JzYngiLCJzeXN0ZW0iOiJBQkhBLUEiLCJyZXF1ZXN0Z XJJZCI6IlBIUi1XRUIiLCJwaHJNb2JpbGUiOm51bGw sImV4cCI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mjkw OTE1LCJwaHJBZGRyZXNzIjoidmFzYW50aGFrdW1h ci5rZXNhdmFuQHNieCIsInR4bklkIjoiYjEwMGM4ZD MtNTE1ZC00YWFiLTg1OWQtYzNlMTUwOTE3ZGY1In0  

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

X\-HIU\-ID

\{\{hiu\-id\}\}

Yes

Identifier of the health information user to which the request was intended

*Example* : IN2810014366

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

2c17a46b\-d28e\-4a60a7cffe77163ae93c  

Yes  

Request ID sent by the patient in the discovery API call\. This request ID will be used to match the flow of linking care contexts for a patient  

Error  

\{  

"code": "ABDM\-1010", "message": "Patient not found"  

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

    \}  

\}  

__Failure Scenario: __ 

\{  

    "transactionId": "66446ece\-396b\-4f22\-a1a6\-756196fdffc9",  

    "error": \{  

        "code": "ABDM\-1010",  

        "message": "Patient not found"  

    \},  

    "response": \{  

        "requestId": "2c17a46b\-d28e\-4a60\-a7cf\-fe77163ae93c"  

    \}  

\}__ __ 

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

    \}  

\]  

Access Denied  

Code : 403 Forbidden  

To verify when invalid  

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

    "message": "Invalid request I 

D"  

\}  

Code:  	 400Bad Request   

When Timestamp is Blank, null or empty in header\.   

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied  

Code  	 : 403 Forbidden   

When invalid Timestamp is pass in header  

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "*\{\{$isoTimestamp\}* 

*\}*jhgftytgtyu",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1016: ",      "message": "Invalid Timesta mp"  

\}  

Code  	 \- 400Bad Request  

When X\-CM\-ID is Invalid, Blank, null or empty in header\.   

\[  

    \{  

        "key": "X\-CM\-ID",  

        "value": "sbxdvdfvdf",  

        "type": "text"  

    \}  

\]  

Access Denied  

Code  	 : 403 Forbidden   

 

Verify when transaction id is invalid, null or blank   

"transactionId": "776a9becab12\-

42bc\-9ae9c63b1ae5bce2",  

"patient": \[  

    \{  

        "referenceNumber": "ST1",  

        "display": "",  

        "careContexts": \[  

            \{  

                "referenceNumber": "S 

T2",  

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

"message": "Invalid Transactio n ID / 

Transaction expired\."  

Verify message when HI types is passed as incorrect   

"transactionId": "776a9becab12\-

42bc\-9ae9c63b1ae5bce2",  

"patient": \[  

    \{  

        "referenceNumber": "ST1",  

        "display": "",  

        "careContexts": \[  

            \{  

                "referenceNumber": "S 

T2",  

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

    "requestId": "6f37ddf8\-62df4afebc25\-599789c90558"  

  

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

                "referenceNumber": "S 

T2",  

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

                "referenceNumber": "S 

T2",  

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

    "requestId": "6f37ddf8\-62df4afebc25\-599789c90558"  

  

\{  

    "code": "ABDM\-1059: ",  

    "message": "Invalid Care  

Contexts count"  

\}  

  

__ __ 

# <a id="_10.3.4__"></a>10\.3\.4   HIE\-CM callback on Health record discover 	

This is a callback API invoked by the __HIE\-CM__ for sharing the response of health record discover\.  

  

__URL:__ \{callback\_url\}/api/v3/hiu/patient/care\-context/on\-discover 

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

f901b782\-bfdf4224\-

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

__ __ 

Request Body  

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

__ __ 

__Response:  __ 

__ __ 

Response  

Code: 200 OK   

  

[image removed - see original document]  

  

  

# <a id="_10.3.5__"></a>10\.3\.5   Patient health record link init  

This API endpoint is designed to be invoked by the patient or user to link their health records\. By using this API, patients can initiate the process of associating their health information with their ABHA \(Ayushman Bharat Health Account\) address\.  

  

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

Actual time when request was initiated, ISO Date time format represents date and time  

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

__ __ 

__ __ 

__ __ 

__ __ 

__ __ 

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

    "code": "ABDM\-1010",  

    "message": "test"  

\},  

"response": \{  

    "requestId": "926ca4ad\-aef5\-4937a26cc2b529464566"  

\}  

  

"code": "ABDM\-9999: ",  

	"message"  	: "Invalid Transaction ID"  

 

Verify  message  

when count  

is incorrect   

"transactionId": "776a9bec\-ab12\-42bc9ae9c63b1ae5bce2",  

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

Request ID is 

Blank, null or empty in header  

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

        "value": "\{\{$guid\}\}zxzzxs",  

        "type": "text"  

    \}  

\]  

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

    \}  

\]  

Access Denied  

Code : 403 Forbidden   

 

When invalid Timestamp  is pass in header  

\[  

    \{  

        "key": "TIMESTAMP",  

        "value": "\{\{$isoTimestamp\}\}jhgftytgtyu",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1016: ",  

    "message": "Invalid Timestamp"  

\}  

 Code  	 \- 400Bad Request  

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

 Code   : 403 Forbidden   

When X\-HIU\- 

ID is Blank, null or empty in header\.   

\[  

    \{  

        "key": "X\-HIU\-ID",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied  

Code : 403 Forbidden   

  

When XAUTHTOKEN  

is Invalid, Blank, null or empty in header\.   

\[  

    \{  

        "key": "X\-CM\-ID",  

        "value": "sbxdvdfvdf",  

        "type": "text"  

    \}  

\]  

\{  

    "code": "ABDM\-1065: ",  

    "message": "Invalid X Auth token"  

\}  

  

When the careContexts is null or empty\.  

"transactionId": "776a9bec\-ab12\-42bc9ae9c63b1ae5bce2",  

"patient": \[  

    \{  

        "referenceNumber": "Testing defect",  

        "careContexts": \[\],  

        "hiType": "PRESCRIPTION",  

          

"count": 0   \}  

  

\{  

    "code": "ABDM\-1057: ",  

    "message": "Invalid Care  

Contexts"  

\}  

  

When  

link/init is called after discovery request expired\.  

  

\{  

    "code": "ABDM\-1086: ",  

    "message": "Invalid Transaction  

ID / Transaction expired\."  

\}  

  

  

# <a id="_10.3.6__"></a>10\.3\.6   HIE\-CM callback on health record link init  

This API will be invoked by the HIE\-CM to initiate the linking of patient health records to HIP\.  

__URL: __\{callback\_url\}/api/v3/hip/link/care\-context/init 

__Request:__ POST  

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

2J4IiwiY2xpZW50SWQiOi JzYngiLCJzeXN0ZW0iOiJ 

BQkhBLUEiLCJyZXF1ZXN0Z 

XJJZCI6IlBIUi1XRUIiLCJwa HJNb2JpbGUiOm51bGws 

ImV4cCI6MTY2NzI5ODEx 

NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt 

Yes   	 

JWT Access token which was issued by ABDM session API after successful validation of client id and secret   

 

NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0  

 

 

__Body Parameters:  __ 

__Property Name__   

__Example Value__   

__Required__   

__Description__   

transactionId  

f901b782\-bfdf\-4224\- 

9f8d\-da2cadc20c0d  

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

__ __ 

__ __ 

__ Request Body:  __ 

__ __ 

Request Body  

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

   \] 

\}  

  

 

__Response:  __ 

__ __ 

Response  

Code : 200 OK   

  

[image removed - see original document]  

  

# <a id="_10.3.7__"></a>10\.3\.7   HMIS/LMIS response on health record link                                        

This API will be invoked by the __HMIS/LMIS__ to share the response of link init API 

\(referenceNumber will be generated by HIP and this will used in the confirm API\)  

__URL:__ /api/hiecm/user\-initiated\-linking/v3/link/care\-context/on\-init  

__Request:__ POST  

__Header Parameters: __  

Property  

Name  

Example Value  

Required  

Description  

Authorization   

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXNhb nRoYWt1bWFyLmtlc2F2YW5Ac2J4IiwiY2xpZW 50SWQiOiJzYngiLCJzeXN0ZW0iOiJBQkhBLUEi LCJyZXF1ZXN0ZXJJZCI6IlBIUi1XRUIiLCJwaHJN 

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

Property  

Name  

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

The details of the link using which the records has to be linked to the patient’s ABHA account\. It will contain details like 

the referenceNumber, 

authenticationType and the meta details of the link  

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

        ""communicationExpiry"": ""2023\- 

06\-31T12: 33: 37\.603Z""  

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

        ""communicationExpiry"": ""2023\- 

06\-31T12: 33: 37\.603Z""  

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

        "communicationExpiry": "2023\- 

06\-31T12: 33: 37\.603Z"  

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

    "code": "ABDM\-9999: ",  

    "message": “Invalid  

communication medium”  

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

“Invalid communication hint”  

\}   

  

# <a id="_10.3.8__"></a>10\.3\.8   HIE\-CM response on health record link                                                             

The on\-init API endpoint allows HIUs to receive and process the initial linking of care contexts associated with a patient\. When a request is made to this endpoint, it returns a detailed response containing the transaction ID, linking information, authentication details, and any errors that occurred\. This ensures that HIUs have the necessary information to manage patient care effectively\.__ __

__URL:__ \{callback\_url\}/api/v3/hiu/patient/care\-context/on\-init 

__Request:__ POST  

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

XJJZCI6IlBIUi1XRUIiLCJwa HJNb2JpbGUiOm51bGws 

ImV4cCI6MTY2NzI5ODEx 

NSwiaWF0IjoxNjY3MjkwO TE1LCJwaHJBZGRyZXNzIjo idmFzYW50aGFrdW1hci5 rZXNhdmFuQHNieCIsInR 4bklkIjoiYjEwMGM4ZDMt NTE1ZC00YWFiLTg1OWQtY zNlMTUwOTE3ZGY1In0  

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

Property  

Name  

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

    \}  

\}  

No  

The details of the link using which the records have to be linked to the patient’s 

ABHA account\. It will contain details like the referenceNumber,  

authenticationType and the meta details of the link  

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

  

# <a id="_10.3.9__"></a>10\.3\.9   Patient Health Record Confirm\.

This API endpoint is designed to be invoked by the patient or user to confirm their health records\. By using this API, patients can validate and confirm the linkage of their health information to their ABHA \(Ayushman Bharat Health Account\) address\. This confirmation process ensures that all relevant care contexts are accurately linked and verified, providing patients with control over their health data\.  

\.  

__URL:__ /api/hiecm/user\-initiated\-linking/v3/link/care\-context/confirm 

__Request:__ POST  

__Header Parameters: __  

Property  

Name  

Example Value  

Required  

Description  

Authorization   

eyJhbGciOiJSUzUxMiJ9\. eyJzdWIiOiJ2YXN hbnRoYWt1bWFyLmtlc2F2YW5Ac2J4IiwiY 2xpZW50SWQiOiJzYngiLCJzeXN0ZW0iOiJ 

BQkhBLUEiLCJyZXF1ZXN0ZXJJZCI6IlBIUi1XR 

UIiLCJwaHJNb2JpbGUiOm51bGwsImV4c 

CI6MTY2NzI5ODExNSwiaWF0IjoxNjY3Mjkw 

OTE1LCJwaHJBZGRyZXNzIjoidmFzYW50aG FrdW1hci5rZXNhdmFuQHNieCIsInR4bklkIj oiYjEwMGM4ZDMtNTE1ZC00YWFiLTg1OWQ tYzNlMTUwOTE3ZGY1In0  

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

Request ID is 

Blank, null or empty in header  

\[  

    \{  

        "key": "REQUEST\-ID",  

        "value": "",  

        "type": "text"  

    \}  

\]  

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

"Invalid   request ID"  

\}  

   

 Code: 400Bad Request   

   

When  

Timestamp is  

Blank, null or empty in header\.  

\[  

    \{  

        "key": "TIMESTAMP",           "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

   

When invalid Timestamp is pass in header  

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

  

When X\- 

HIU\-ID is Blank, null or empty in header\.    

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

When XAuthTOKEN  

is Invalid in header\.  

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

  

Code  	 \- 400Bad Request"  

Verify  message  when invalid token is passed  

\{  

    "token": 7897654,  

    "linkRefNumber": "Testing defect"  

\}   

  

\{  

    "code": "ABDM\-9999: ",     "message": 

Invalid link reference number\."  

\}   

Verify  message  when the X\- 

HIU\-ID is different from the hiu that initiated link request\.  

 

\{  

    "code": "ABDM\-1040: ",  

    "message": “Invalid HIU ID\."  

\}   

  

  

#                                                        

# <a id="_10.3.10__"></a>10\.3\.10   HIE\-CM callback for health record confirmation

This API endpoint is designed to be invoked by the patient or user to confirm their health records\. By using this API, patients can validate and confirm the linkage of their health information to their ABHA \(Ayushman Bharat Health Account\) address\.   

__ URL:__ \{callback\_url\}/api/v3/hip/link/care\-context/confirm 

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

Unique UUID for tracking the endto\-end request transaction   

TIMESTAMP   

2022\-10\-06T10:10:00\.587Z   

Yes   

Actual time when request was initiated, ISO Date time format represents date and time  

X\-HIU\-ID   

IN2810014366  

Yes   

Identifier of the health 

information provider to which the request was intended  

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
  "token": "123456",  
  "linkRefNumber": "\{\{linkRefNumber\}\}"  
\}  
 

__Response:  __ 

Response  

Code : 202 Accepted   

  

[image removed - see original document]  

  

# <a id="_10.3.11__"></a>10\.3\.11   HMIS/LMIS response on health record confirm  

The on\-confirm API endpoint allows HIUs to receive and process the confirmation of care context linking for a patient\. When a request is made to this endpoint, it returns a detailed response containing the patient’s care contexts, transaction details, and any errors that occurred\. This ensures that HIUs have the necessary information to manage patient care effectively and verify that the care contexts have been correctly linked\.

__URL:__ /api/hiecm/user\-initiated\-linking/v3/link/care\-context/on\-confirm 

__Request:__ POST  

__Header Parameters:__  

Property  

Name  

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

f207e461\-1994\-42749b86554384f170ab  

Yes  

Request ID sent in init API call\. This request ID will be used to match the flow of linking care contexts for a patient  

__Request Body: __ 

Request Body:  

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

Response  

Code : 202 Accepted   

__Error scenarios: __ 

__ __ 

__Scenario__ __s __ 

__Request Body __ 

__Response __ 

To verify  when  Request ID is Blank,  null or empty in header  

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

        "value": "*\{\{$guid\}\}*zxzzxs",           "type": "text"  

    \}\]  

\{  

    "code": "ABDM\-1030: ",  

    "message": "Invalid request ID"  

\}  

Code: 400Bad Request   

  

When X\- 

HIP\-ID is  

Blank, null or empty in header\.    

\[  

    \{  

        "key": "X\-HIP\-ID",  

        "value": "",  

        "type": "text"  

    \}  

\]  

Access Denied   

Code : 403 Forbidden   

  

When X\- CM\-ID is  

Invalid,  

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

Verify  message  when  

request id is passed  

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

message when  

count is incorrect   

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

# <a id="_10.3.12__"></a>10\.3\.12   HIE\-CM response on health record on\-confirm  

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

f207e461\-1994\-42749b86554384f170ab  

Yes  

Request ID sent in the init API call\. This request ID will be used to match the flow of linking care contexts for a patient  

__Request Body: __ 

 

Request Body  

\{  

   "patient": \[  

       \{  

           "referenceNumber": "4336268d\-89a3\-4c84\-8674\-aef42092d9fc",             "display": "abcdefgdisplay",  

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

# <a id="_10.3.13__"></a> 10\.3\.13   HIE\-CM all\-providers

This API retrieves a list of providers whose names match the specified query parameter\. The response includes detailed information about each provider, such as their identifier, facility type, and other attributes\. 

__URL:__ api/hiecm/gateway/v3/providers?stateCode=\-1&districtCode=\-1&name=test

__Request:__ GET  

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

X\-CM\-ID   

\{\{cm\-id\}\}

Yes   

Suffix of the consent manager to which the request was intended

__Response: __ 

__ __ 

Response  

Code : 200 Ok

\[  
    \{  
        "identifier": \{  
            "name": "DRiefcase Health Locker",  
            "id": "driefcasehl"  
        \},  
        "facilityType": \[  
            "HIP",  
            "HIU",  
            "HEALTH\_LOCKER"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{  
            "healthLockerEndpoints": \[  
                \{  
                    "use": "registration",  
                    "connectionType": "HTTPS",  
                    "address": "[https://uatmy\.driefcase\.com/Pages/HL/Register\.aspx"](https://uatmy.driefcase.com/Pages/HL/Register.aspx%22)  
                \},  
                \{  
                    "use": "data\-upload",  
                    "connectionType": "HTTPS",  
                    "address": "[https://uatmy\.driefcase\.com/Pages/HL/Upload\.aspx"](https://uatmy.driefcase.com/Pages/HL/Upload.aspx%22)  
                \}  
            \]  
        \}  
    \},  
    \{  
        "identifier": \{  
            "name": "DRiefcase HIP",  
            "id": "driefcasehip"  
        \},  
        "facilityType": \[  
            "HIP",  
            "HIU"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "DRiefcase HIU",  
            "id": "driefcasehiu"  
        \},  
        "facilityType": \[  
            "HIU"  
        \],  
        "isHIP": false,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "DRiefcase PHR",  
            "id": "driefcasephr"  
        \},  
        "facilityType": \[  
            "PHR"  
        \],  
        "isHIP": false,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "DriefcaseConnectHiu",  
            "id": "driefcase\-connect\-hiu"  
        \},  
        "facilityType": \[  
            "HIU"  
        \],  
        "isHIP": false,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "DriefcaseConnectHip",  
            "id": "driefcase\-connect\-hip"  
        \},  
        "facilityType": \[  
            "HIP"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "UhiDriefcaseHiu",  
            "id": "uhi\-driefcase\-hiu"  
        \},  
        "facilityType": \[  
            "HIP",  
            "HIU"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "DRiefcase Connect",  
            "id": "dfcconnect"  
        \},  
        "facilityType": \[  
            "HIP"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "DRiefcase Connect HIP",  
            "id": "dfcconnectuat\-hip"  
        \},  
        "facilityType": \[  
            "HIP"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "Driefcase Connect HIP",  
            "id": "driefcaseconnect\-hip"  
        \},  
        "facilityType": \[  
            "HIP"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "Driefcase Connect HIU",  
            "id": "driefcaseconnect\-hiu"  
        \},  
        "facilityType": \[  
            "HIU"  
        \],  
        "isHIP": false,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "Driefcase 001",  
            "id": "INDFC001"  
        \},  
        "facilityType": \[  
            "HIP"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "UhiDriefcaseHip",  
            "id": "uhi\-driefcase\-hip"  
        \},  
        "facilityType": \[\],  
        "isHIP": false,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "UhiDriefcaseHip",  
            "id": "uhi\-driefcase\-hip"  
        \},  
        "facilityType": \[  
            "HIP",  
            "HIU"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "Driefcase Valsad",  
            "id": "IN2410000026"  
        \},  
        "facilityType": \[  
            "HIP",  
            "HIU"  
        \],  
        "isHIP": true,  
        "isGovtEntity": false,  
        "endpoints": \{\}  
    \}  
\]   

  

                            

# 10\.3\.14   HIE\-CM provider\-by\-provider\-id

This API is designed to retrieve the details of a specific provider based on the provided provider ID\. When invoked, it queries the system to fetch comprehensive information about the provider identified by the given ID\.  

__URL:__ /api/hiecm/gateway/v3/providers/\{\{hip\-id\}\}

__Request:__ GET  

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

X\-CM\-ID   

\{\{cm\-id\}\}

Yes   

Suffix of the consent manager to which the request was intended

__Response: __ 

__ __ 

Response  

Code : 200 Ok   

\{  
    "identifier": \{  
        "name": "DRiefcase Health Locker",  
        "id": "driefcasehl"  
    \},  
    "facilityType": \[  
        "HIP",  
        "HIU",  
        "HEALTH\_LOCKER"  
    \],  
    "isHIP": true  
\}

  

# <a id="_10.3.15__"></a>10\.3\.15   HIE\-CM Govt Programs

This API is designed to retrieve a list of government programs\. When invoked, it queries the system to fetch comprehensive information about various government programs available\. This functionality is particularly useful for users who need to access detailed information about different programs\.  

__URL:__ /api/hiecm/gateway/v3/govt\-programs

__Request:__ GET  

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

X\-CM\-ID   

\{\{cm\-id\}\}

Yes   

Suffix of the consent manager to which the request was intended

__Response: __ 

__ __ 

Response  

Code : 200 Ok

\[  
    \{  
        "identifier": \{  
            "name": "AB \- PMJAY",  
            "id": "PMJAY"  
        \},  
        "facilityType": \[  
            "HIP"  
        \],  
        "isHIP": true  
    \},  
    \{  
        "identifier": \{  
            "name": "CoWINSIT",  
            "id": "CoWINSIT"  
        \},  
        "facilityType": \[  
            "HIP"  
        \],  
        "isHIP": true,  
        "attributes": \{\}  
    \},  
    \{  
        "identifier": \{  
            "name": "RCH MoHFW",  
            "id": "rch\_hip"  
        \},  
        "facilityType": \[  
            "HIP"  
        \],  
        "isHIP": true  
    \},  
    \{  
        "identifier": \{  
            "name": "Test",  
            "id": "MAYUR\_HIP"  
        \},  
        "facilityType": \[  
            "HIP"  
        \],  
        "isHIP": true  
    \}  
\]   

  

# <a id="_11._API_listing"></a>11\. API listing

# PHR

__No__\.

__Flow__

__Serial__

__v3 API__

__Description__

__1__

__Enrolment Of ABHA Address__

1\.1

/abha/api/v3/phr/app/enrollment/request/otp

This generic API endpoint will be used to generate OTP using notification service for the given scope, loginHint, loginId and the otpSystem\.

1\.2

/abha/api/v3/phr/app/enrollment/verify

This API endpoint will be used to verify OTP for given scope and authData against the transaction Id, phr\_auth\_transaction table populated and compare the OTP value with Redis cache\.

1\.3

/abha/api/v3/phr/app/enrollment/suggestion

While user try to create abha address, list of abha addresses are generated to choose using this API

1\.4

/abha/api/v3/phr/app/enrollment/isExists

This API will be invoked to check abhaAddress is exists or not\.

1\.5

/abha/api/v3/phr/app/enrollment/enrol

After successful OTP verification, the user can create a new ABHA Address using this API

__2__

__Login into PHR__

2\.1

/abha/api/v3/phr/app/login/request/otp

The user will be asked to enter their ABHA Number or Mobile Number or Email Address\. For a valid Login id, the OTP will be sent to the mobile or email internally by calling the service to send OTP for the given scope, loginHint, loginId and otpSystem\.

<a id="_Hlk126070578"></a>

2\.2

/abha/api/v3/phr/app/login/verify

After receiving the OTP, it will be validated and verified internally by calling the service to verify the Aadhaar OTP or ABHA OTP for the given scope and authData against the transaction ID using this API

2\.3

/abha/api/v3/phr/app/login/search

This API will internally call enrollment db service to get auth methods for given abha address from the phr\_user\_auth\_methods\.

2\.4

/abha/api/v3/phr/app/login/verify/user

This API is used to verify PHR login\. Once the Password is verified successfully, the user is allowed to create the ABHA Address\.

3

__ABHA profile Management__

3\.1

/abha/api/v3/phr/app/login/profile/request/otp

This API allows users to update their email id or mobile number\. An OTP is sent to the new email id or mobile number for verification, and once verified, the new email id or mobile number will be updated in the system\. Also, this API will be called to link and de\-link ABHA number via ABHA OTP or AADHAAR OTP\.

3\.2

/abha/api/v3/phr/app/login/profile/verify

This is an API that will be sending OTP and verifying with the new email id, mobile number or password will be updated\. Also used to verify profile by passing ABHA OTP or AADHAAR OTP\.

3\.3

/abha/api/v3/phr/app/login/profile/link

This API is used for ABHA profile ABHA or AADHAAR link request\.

3\.4

/abha/api/v3/phr/app/login/profile/deLink

This API is invoked to De link the Abha number via ABHA otp request or Aadhaar otp system\.

3\.5

/abha/api/v3/phr/app/login/profile

This Api is used to fetch ABHA profile

3\.6

/abha/api/v3/phr/app/login/profile/verify/switch\-profile/user

This API will be invoked to switch profile

3\.7

/abha/api/v3/phr/app/login/profile/qrCode

This Api is used to fetch QR Code

3\.8

/abha/api/v3/phr/app/login/profile/phrCard

This Api is used to fetch PHR Card\.

3\.9

/abha/api/v3/phr/app/login/profile/updateProfile

This API is used to update ABHA profile

3\.10

/abha/api/v3/phr/app/login/profile/request/token

This API will be invoked to refresh token\.

3\.11

/abha/api/v3/phr/app/login/profile/request/logout

This Api is used to logout\.

# <a id="_Toc176957960"></a>HIECM Health Locker

No\. 

 	__Flow__  

__Serial__ 

 

__v3 API__  

__Description__  

  1

Subscripti on  

1\.1  

/api/hiecm/subscriptionrequests/v3/requests?statu s=ALL&limit=10&offset=0  

API will be invoked by the patient/user from the PHR application to fetch his/her subscribed HIU details  

  

__ __ 

1\.2  

/api/hiecm/subscriptionrequests/v3/init  

API which will be invoked by the HIU to initiate subscription request to the patient/user from PHR application  

  

__ __ 

1\.3  

\{\{call  

back\}\}/api/v3/hiu/hiecm/s ubscription\-requests/oninit  

API which will be invoked by the HIU to initiate subscription request to the patient/user from PHR application\.   

In these two calls back will be received one by the HIU that request has been raised with the subscription request id and other will be received by the patient if patient is registered in the PHR app/health locker  

  

__ __ 

1\.4  

/api/hiecm/subscriptionrequests/v3/hiu/on\-notify  

API that will be invoked by the HIU to notify HIECM that HIU has raised the subscription request  

  

__ __ 

1\.5  

/api/hiecm/subscriptionrequests/v3/\{subscription\_r equestid\}/approve  

Api will be invoked by the patient/user from PHR application to approve the subscription request raised by the HIU  

  

__ __ 

1\.6  

\{\{callback\}\}  

/api/v3/hiu/subscriptionrequests/hiu/notify  

HIECM will notify to the HIU about subscription request raised by the HIU is approved  

  

__ __ 

1\.7  

/api/hiecm/subscriptionrequests/v3/hiu/carecontext/onnotify  

api will be invoke by the HIU to notify HIECM about the subscription request has been approved or denied  

  

__ __ 

1\.8  

 /api/hiecm/subscriptionrequests/v3/\{subscription\_i d\}\}/deny  

api will be invoke by the HIU to notify HIECM about the subscription request has been approved or denied  

  

__ __ 

1\.9  

\{\{ call  

back\}\}/api/v3/hiu/subscript ion\-requests/hiu/notify  

api will be invoke by the patient to deny the subscription request raise by the HIU  

  

__ __ 

1\.\.10  

/api/hiecm/subscriptionrequests/v3/patients/\{subs cription\_id\}  

API will be invoked by the patient/user from PHR application to edit the subscription\.  

2

__Consent Flow __ 

1\.11  

/api/hiecm/consent/v3/req uest/init  

API used to raise consent request  

  

__ __ 

1\.12  

\{callback\}/api/v3/hiu/cons ent/request/on\-init  

Callback API used to notify hiu  

  

__ __ 

1\.13  

/api/hiecm/consent/v3/req uest/status  

API used to fetch the status of consent request  

  

__ __ 

1\.14  

\{callback\_url\}/api/v3/hiu/c onsent/request/on\-status  

Callback api is used to give the response of status  

  

__ __ 

1\.15  

/api/hiecm/consent/v3/fetc h  

API used to fetch the consent details  

  

__ __ 

1\.16  

\{callback\_url\}  

/api/v3/hiu/consent/onfetch  

Callback api used to give a response of fetch api  

 

__Data flow __ 

1\.17  

/api/hiecm/dataflow/v3/healthinformation/request  

This api indicates the exchange of health data request from HIU to HIP  

  

__ __ 

1\.18  

\{callback\_url/api/v3/hiu/he alth\-information/onrequest  

callback API for acknowledgment of Health information request of HIU\. CM calls this API when it has validated the Health Information request given the consent id\. • 

 	Either the hiRequest or  error would need to be specified\. If the health info 

request was valid, then the hiRequest\.transactionId specifies the transaction context against which HIP would send over the data  

  

__ __ 

1\.19  

/api/hiecm/dataflow/v3/healthinformation/notify 

API will be called by HIU and HIP to notify the CM about the status of the data transfer\.  

  

HIP on the transfer of data would send sessionStatus \- one of \[TRANSFERRED, FAILED\]\. HIP would also send hiStatus for each careContextReference \- on of  

\[DELIVERED, ERRORED\]  

•  	  

HIU on receipt of data would send sessionStatus \- one of \[RECEIVED, FAILED\]\. For example, ERRORED when data was not sent or if invalid data was sent\. HIU would also send hiStatus for each 

careContextReference \- one of \[OK, ERRORED\]\.  

__2 __ 

__HIP initiated linking __ 

2\.1  

/api/hiecm/v3/token/gene rate\-token  

This generic API endpoint will be used to generate a linking token to link care context\.  

__ __ 

__ __ 

2\.2  

\{callback\_url\}/api/v3/hip/token/ongenerate\-token  

This is a Call\-back API for hiecm/api/v3 /token/generatetoken  

__ __ 

__ __ 

2\.3  

/api/hiecm/hip/v3/link/car econtext  

This API needs to be called by the HIP to link the care context against the patient ABHA address, once the HIP has the valid linking token generated against the same patient ABHA address\.  

__ __ 

__ __ 

2\.4  

\{callback\_url\}/api/v3/link/ on\_carecontext  

This is a Call\-back API for hiecm/api/v3 /link/carecontext  

__ __ 

__ __ 

2\.5  

/api/hiecm/hip/v3/link/pat ient/links  

This API will be invoked to get all the linked health records of the patient\.  

__ __ 

__ __ 

2\.6  

/api/hiecm/hip/v3/link/co ntext/notify  

This API will be invoked by HIP after updating a health record to notify all the subscribed HIUs\.  

__ __ 

__ __ 

2\.7  

\{callbackURL\}/api/v3/links/ context/onnotify  

This is a callback api for  

/hiecm/api/v3/link/context/notify  API\.  

__ __ 

__ __ 

2\.8  

/api/hiecm/hip/v3/link/pat ient/links/sms/notify2  

This API will be invoked by HIP to trigger a SMS notification to the patient mobile number\.  

__ __ 

__ __ 

2\.9  

\{callbackURL\}/api/v3/patie nts/sms/onnotify  

This is a callback API for  

/hiecm/api/v3/link/patient/links/ sms/notify2 API call\.  

__ __ 

__ __ 

2\.10  

/api/hiecm/hip/v3/link/pat ient/links/hip/ondeactivate  

This API will be invoked by HIP as a response on deactivating an abha address\.  

__ __ 

__ __ 

2\.11  

/api/hiecm/hip/v3/link/pat ient/links/hiu/ondeactivate  

This API will be invoked by HIU as a response on deactivating an abha address\.  

__3 __ 

__User initiated linking__  

3\.1  

/api/hiecm/userinitiated\- 

linking/v3/patient/carecontext/discover 

This API will be invoked by the  __patient/user__ from the PHR application to discover his/her health records\.  

  

  

3\.2  

\{callback\_url\}/api/v3/hi p/patient/carecontext/discover  

This API will be invoked by the __HIE\-CM__ to discover patient health records from  HIP\.  

 

  

3\.3  

/api/hiecm/userinitiatedlinking/v3/patient/carecontext/ondiscover  

This API will be invoked by the __HMIS/LIMS __

__application__ for sharing the response of the discover API\.  

  

3\.4  

\{callback\_url\}/api/v3/hi u/patient/carecontext/on\-discover  

This API will be invoked by the __HIECM__ for sharing the response of the discover API\.  

  

3\.5  

/api/hiecm/userinitiated\- linking/v3/link/carecontext/init  

This is an API that will be invoked by the __patient/user__ to link his/her health records\.  

  

3\.6  

\{callback\_url\}/api/v3/hi p/link/care\-context/init  

This API will be invoked by the __HIECM__ to link patient/user health records to HIP\.  

  

3\.7  

/api/hiecm/userinitiatedlinking/v3/link/carecontext/on\-init  

This is an API that will be invoked by the __HIP__ to share the response of the init API\.  

  

3\.8  

\{callback\_url\}/api/v3/hi u/patient/carecontext/on\-init  

This is an API that will be invoked by the __HIE\-CM__ to share the response of the init 

API with the Patient\.  

  

3\.9  

/api/hiecm/userinitiatedlinking/v3/link/carecontext/confirm  

This API will be invoked by the __patient/user__ to confirm his/her health records\.  

  

3\.10  

\{callback\_url\}/api/v3/hi p/link/carecontext/confirm  

This API will be invoked by the __HIECM__ to confirm patient/user health records to HIP\.  

  

3\.11  

/api/hiecm/userinitiatedlinking/v3/link/carecontext/onconfirm  

This is an API that will be invoked by the HIP to share the response of the confirmed  API\.  

  

  

3\.12  

\{callback\_url\}/api/v3/hi u/patient/carecontext/on\-confirm  

This API will be invoked by the HIECM to share the response of confirm API to the patient\.  

__4  __

__Patient Share__  

4\.1  

/api/hiecm/patientshare/v3/share  

This API will be invoked from the integrator application \(any PHR application, 

just like  

ABHA\) to share the user/patient profile with HMIS/LIMS\.  

  

  

4\.2  

\{callback\_url\}/api/v3/hi p/patient/share  

Callback API for patient share  

  

  

4\.3  

/api/hiecm/patientshare/v3/on\-share  

This API will be invoked by HIP to acknowledge the request by the user/patient to share the profile details\.  

  

  

4\.4  

\{callback\_url\}/api/v3/hi u/patient/on\-share  

Callback for Patient on\-share  

__5 __ 

__Session __ 

5\.1  

/api/hiecm/gateway/v3 

/sessions  

API to generate Auth token  

# <a id="_12._Error_codes"></a>12\. Error codes listing

__Code__

__Error__

ABDM\-1000

Unable to connect the database

ABDM\-1001

No data found

ABDM\-1002

Integrity violation

ABDM\-1003

Email Gateway is unavailable

ABDM\-1004

SMS Gateway is unavailable

ABDM\-1005

Invalid receiver

ABDM\-1006

Bad Request, invalid request Body

ABDM\-1007

Connection failed due to timeout

ABDM\-1008

SMS service currently disabled 

ABDM\-1009

Email service currently disabled

ABDM\-1010

Validation failed

ABDM\-1011

Gateway database unavailable

ABDM\-1012

No records found against the ABHA Address

ABDM\-1013

Invalid ABHA Number

ABDM\-1014

Invalid Mobile Email

ABDM\-1015

Invalid Response

ABDM\-1016

Invalid TimeStamp

ABDM\-1017

Invalid TransactionId

ABDM\-1018

Share Profile database unavailable

ABDM\-1019

Dependent Service Unavailable

ABDM\-1020

Unknown database

ABDM\-1021

Lack of required priviledges

ABDM\-1022

Too many requests

ABDM\-1023

Invalid User

ABDM\-1024

Dependent service unavailable

ABDM\-1025

Invalid ServiceId

ABDM\-1026

Invalid Link Token

ABDM\-1027

You are blocked\. Please try again after 24 hours\.

ABDM\-1028

HIP is unavailable

ABDM\-1029

Redis server is unavailable

ABDM\-1030

Invalid request ID

ABDM\-1031

Invalid request

ABDM\-1032

Invalid header

ABDM\-1033

HIU is unavailable

ABDM\-1034

Notification service unavailable

ABDM\-1035

Invalid HIP ID

ABDM\-1035

OTP does not match

ABDM\-1036

Data does not match

ABDM\-1037

Counter and Care context count mismatch

ABDM\-1038

ABHA address and Link token mismatch

ABDM\-1039

Invalid Consent request id

ABDM\-1040

Invalid HIU ID

ABDM\-1041

Invalid Acknowledgement

ABDM\-1042

Provider Mandatory

ABDM\-1043

ABHA Address does not match with KYC details\.

ABDM\-1044

Broadcast Failed

ABDM\-1045

Database Access is restricted

ABDM\-1046

Invalid Purpose

ABDM\-1047

Purpose does not exist

ABDM\-1048

Timeout

ABDM\-1049

Invalid Profile Share Intent Keys

ABDM\-1050

Invalid Profile Share Metadata Keys

ABDM\-1051

Invalid ABHA Number or ABHA Address

ABDM\-1052

Invalid TransactionId or response's requestId

ABDM\-1053

Data already exists

ABDM\-1054

Invalid Subscription Request Id

ABDM\-1401

HIP is not available

ABDM\-1402

Acknowledgement is not received from HIP

ABDM\-9999

Unknown exception

ABDM\-1061

Consent artefact expired

ABDM\-1062

Consent Not granted

ABDM\-1063

Date Range given is invalid

ABDM\-1064

request with this request id already exists

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

You have requested multiple OTPs Or Exceeded maximum number of attempts for OTP match in this transaction\. Please try again in 30 minutes\. 

ABDM\-1006 

Bad Request, invalid request Body 


