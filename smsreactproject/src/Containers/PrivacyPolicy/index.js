import React, { useState } from 'react'
import { useLocation } from 'react-router-dom';
import './styles.scss'



// Privacy Policy Page
export const PrivacyPolicy = ({ institute }) => (
  <div className="container">
    <h1>Privacy Policy</h1>
    <p>
      {institute.name} respects your privacy and is committed to protecting your personal data...
    </p>

    <h2>Information We Collect</h2>
    <p>We collect the following types of information:</p>

    <h3>🔹 Personal Information</h3>
    <p>When you register, we may collect:</p>
    <ul>
      <li>Name</li>
      <li>Email address</li>
      <li>Phone number</li>
      <li>Date of birth</li>
      <li>Profile picture (optional)</li>
      <li>Payment details</li>
    </ul>

    <h3>🔹 Academic Information</h3>
    <ul>
      <li>Course enrollments</li>
      <li>Assignments and quizzes</li>
      <li>Progress and performance</li>
      <li>Certificates earned</li>
    </ul>

    <h3>🔹 Technical Information</h3>
    <ul>
      <li>IP address</li>
      <li>Browser type/version</li>
      <li>Device type</li>
      <li>Operating system</li>
    </ul>

    <h2>How We Use Your Information</h2>
    <ul>
      <li>✅ Provide and improve services</li>
      <li>✅ Personalize learning</li>
      <li>✅ Process payments securely</li>
      <li>✅ Prevent fraud</li>
    </ul>

    <h2>How We Share Your Information</h2>
    <ul>
      <li>🔹 With instructors & students</li>
      <li>🔹 With payment providers</li>
      <li>🔹 With legal authorities</li>
    </ul>

    <h2>Cookies & Tracking</h2>
    <p>We use cookies for improved functionality and analytics.</p>
    <ul>
      <li>🔹 Essential Cookies: login/security</li>
      <li>🔹 Analytics Cookies: site usage</li>
      <li>🔹 Marketing Cookies: ads</li>
    </ul>

    <h2>Your Rights & Choices</h2>
    <ul>
      <li>✅ Access your data</li>
      <li>✅ Request data deletion</li>
      <li>✅ Opt-out of marketing</li>
    </ul>
    <p>Contact us at {institute.email}</p>

    <h2>Contact Us</h2>
    <p>
      📧 Email: {institute.email}<br />
      📞 Phone: {institute.tel_num}<br />
      🌐 Website: {institute.website_link}<br/>
      {institute.address && (
        <span>📍 {institute.address}</span>
      )}
    </p>
  </div>
)

// Refund Policy Page
export const RefundPolicy = ({institute}) => (
  <div className="container">
    <h1>Refund Policy</h1>
    <p>
      At {institute.name}, we want you to have a positive learning experience...
    </p>

    <h2>Eligibility for Refunds</h2>

    <h3>🔹 Course Enrollment Refund</h3>
    <ul>
      <li>✅ <strong>Within 7 Days</strong> – Refund if under 50% completion</li>
      <li>✅ <strong>Beyond 7 Days</strong> – Case-by-case review</li>
    </ul>

    <h3>🔹 Subscription Refund</h3>
    <ul>
      <li>✅ <strong>Monthly</strong> – Full refund within 7 days</li>
      <li>✅ <strong>Annual</strong> – Prorated refund within 30 days</li>
    </ul>

    <h2>Non-Refundable Fees</h2>
    <ul>
      <li>🚫 Processing fees</li>
      <li>🚫 Discounted courses</li>
      <li>🚫 Paid certificates</li>
    </ul>

    <h2>How to Request a Refund</h2>
    <ul>
      <li>📧 <strong>Contact Us</strong> – {institute.email}</li>
      <li>📝 <strong>Provide Details</strong> – course name, reason</li>
      <li>⏳ <strong>Review Process</strong> – reply within 7 days</li>
      <li>💰 <strong>Refund Issuance</strong> – processed in 10 days</li>
    </ul>

    <h2>Refunds for Technical Issues</h2>
    <p>Contact support for access issues – may offer refund if unresolved.</p>

    <h2>Cancellations by {institute.name}</h2>
    <p>Full refund if course/service is canceled by us.</p>

    <h2>Payment Methods</h2>
    <p>Refund to original payment method within 10 business days.</p>

    <h2>Contact Us</h2>
    <p>
      📧 {institute.email}<br />
      📞 {institute.tel_num}<br />
      🌐 {institute.website_link}<br/>
      {institute.address && (
        <span>📍 {institute.address}</span>
      )}
    </p>
  </div>
)

// About Us Page
export const AboutUs = ({institute}) => (
  <div className="container">
    <h1>About {institute.name}</h1>
    <p>Welcome to {institute.name}, your trusted platform for seamless online learning...</p>

    <h2>Our Mission</h2>
    <p>
      To revolutionize education by making learning accessible, engaging, and effective...
    </p>

    <h2>What We Offer</h2>
    <ul>
      <li>📚 High-quality courses</li>
      <li>👩‍🏫 Expert instructors</li>
      <li>⚡ Interactive experiences</li>
      <li>📈 Progress tracking</li>
      <li>🔒 Secure platform</li>
    </ul>
    <p>
      📧 {institute.email}<br />
      📞 {institute.tel_num}<br />
      🌐 {institute.website_link}<br/>
      {institute.address && (
        <span>📍 {institute.address}</span>
      )}
    </p>
  </div>
)

export const Terms = ({institute}) => (
  <div className="container">
    <div className="content">
      <h1 className="heading">Terms and Conditions</h1>
      <p className="paragraph">
        By accessing or using {institute.name} website and services, you agree to comply with and be bound by these 
        Terms and Conditions. Please read them carefully before using our platform.
      </p>

      <h2 className="sub-heading">Acceptance of Terms</h2>
      <p className="paragraph">
        By accessing our website or using our services, you agree to comply with and be bound by these 
        Terms and Conditions, which may be updated periodically. If you do not agree with these terms, 
        please do not use our website or services.
      </p>

      <h2 className="sub-heading">User Registration and Account</h2>
      <p className="paragraph">To access certain features on our platform, you may need to create an account. When you register, you agree to:</p>
      <ul>
        <li className="list-item">✅ Provide accurate and complete information during the registration process.</li>
        <li className="list-item">✅ Keep your account information updated.</li>
        <li className="list-item">✅ Maintain the confidentiality of your account credentials.</li>
        <li className="list-item">✅ Be responsible for all activities under your account, whether authorized or not.</li>
      </ul>

      <h2 className="sub-heading">Course Content and Usage</h2>

      <p className="bold-text">🔹 License to Use Content</p>
      <p className="paragraph">
        When you purchase or access courses, you are granted a non-transferable, non-exclusive license 
        to view the content for personal, non-commercial use only. All intellectual property rights, 
        including copyright, in the course materials belong to {institute.name} or its licensors.
      </p>

      <p className="bold-text">🔹 Restrictions</p>
      <ul>
        <li className="list-item">🚫 Copying, distributing, or modifying course materials.</li>
        <li className="list-item">🚫 Sharing account login details with others.</li>
        <li className="list-item">🚫 Using the content for any commercial purposes.</li>
      </ul>

      <h2 className="sub-heading">User Conduct</h2>
      <p className="paragraph">When using our platform, you agree to:</p>
      <ul>
        <li className="list-item">✅ Use the platform for lawful purposes only.</li>
        <li className="list-item">✅ Not engage in any activity that may harm the platform, its users, or its content.</li>
        <li className="list-item">✅ Refrain from posting offensive, discriminatory, or unlawful content.</li>
      </ul>

      <h2 className="sub-heading">Payment and Billing</h2>

      <p className="bold-text">🔹 Payment Methods</p>
      <p className="paragraph">
        We accept various payment methods for purchasing courses or subscriptions, including credit/debit cards 
        and third-party payment providers (e.g., PayPal, Stripe).
      </p>

      <p className="bold-text">🔹 Payment Responsibility</p>
      <ul>
        <li className="list-item">✅ By making a purchase, you agree to pay the fees associated with the course or subscription.</li>
        <li className="list-item">✅ All payments are non-refundable, except as stated in our Refund Policy.</li>
      </ul>

      <h2 className="sub-heading">Privacy and Data Protection</h2>
      <p className="paragraph">
        Your use of {institute.name} services is also governed by our Privacy Policy, 
        which outlines how we collect, use, and protect your personal data. By using our platform, 
        you consent to the collection and use of your information as described in the Privacy Policy.
      </p>

      <h2 className="sub-heading">Termination of Account</h2>
      <p className="paragraph">
        {institute.name} reserves the right to suspend or terminate your account if you violate these 
        Terms and Conditions or engage in inappropriate behavior. If your account is terminated, 
        you will lose access to your purchased courses and data, and no refunds will be issued.
      </p>

      <h2 className="sub-heading">Disclaimers and Limitation of Liability</h2>

      <p className="bold-text">🔹 No Guarantee of Results</p>
      <p className="paragraph">
        While we strive to provide quality content, {institute.name} makes no guarantees regarding the 
        results you may achieve from using our courses.
      </p>

      <p className="bold-text">🔹 Limitation of Liability</p>
      <p className="paragraph">
        {institute.name}'s liability is limited to the amount paid by you for the course or service in the last 12 months. 
        We are not liable for any indirect, incidental, or consequential damages.
      </p>

      <h2 className="sub-heading">Intellectual Property</h2>
      <p className="paragraph">
        All content provided on {institute.name}, including course materials, text, graphics, logos, and trademarks, 
        is the property of {institute.name} or its content providers and is protected by copyright and trademark laws.
      </p>

      <h2 className="sub-heading">Governing Law and Dispute Resolution</h2>
      <p className="paragraph">
        These Terms and Conditions are governed by the Law Enforcement. Any disputes arising out of or relating to these 
        terms will be resolved through arbitration in Bengaluru, and you agree to submit to the exclusive jurisdiction 
        of the courts in Bengaluru.
      </p>

      <h2 className="sub-heading">Modifications to Terms</h2>
      <p className="paragraph">
        We reserve the right to update or modify these Terms and Conditions at any time. Any changes will be posted 
        on this page, and the revised version will become effective immediately upon posting.
      </p>

      <h2 className="sub-heading">Contact Us</h2>
      <p className="paragraph">
        📧 Email: {institute.email}<br />
        📞 Phone: {institute.tel_num}<br />
        🌐 Website: {institute.website_link}<br/>
        {institute.address && (
        <span>📍 {institute.address}</span>
      )}
      </p>
    </div>
  </div>
)


export const InfoTabs = (props) => {
  const [activeTab, setActiveTab] = useState(props.activeTab)
  const location = useLocation();
  let user = {};
  try {
    const stored = localStorage.getItem("user");
    const parsed = stored ? JSON.parse(stored) : {};
    user = Object.keys(parsed).length ? parsed : props.user;
  } catch {
    user = props.user;
  }
  let institute = {}
  try{
    let signupconfig = localStorage.getItem("signupconfig")
    signupconfig = signupconfig ? JSON.parse(signupconfig) : null;
    institute = signupconfig ? signupconfig.institute_details : user?.institute_details 
  }catch{
    console.log("error")
  }
  const renderContent = () => {
    switch (activeTab) {
      case 'privacy':
        return <PrivacyPolicy institute={institute} />
      case 'refund':
        return <RefundPolicy institute={institute} />
      case 'about':
        return <AboutUs institute={institute} />
        case 'terms':
          return <Terms institute={institute} />
      default:
        return <PrivacyPolicy institute={institute} />
    }
  }

  return (
    <div>
      <div className="tab-bar">
      { !props.hideTab &&
        <button
          className={activeTab === 'privacy' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy Policy
        </button>
      }
      { !props.hideTab &&
        <button
          className={activeTab === 'refund' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('refund')}
        >
          Refund Policy
        </button>
      }
      { !props.hideTab &&
        <button
          className={activeTab === 'about' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('about')}
        >
          About Us
        </button>
      }
      { !props.hideTab &&
        <button
          className={activeTab === 'terms' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('terms')}
        >
          Terms and Condition
        </button>
      }
      </div>
      <div className="tab-content">{renderContent()}</div>
    </div>
  )
}

export default InfoTabs
