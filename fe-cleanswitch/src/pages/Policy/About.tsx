import React from 'react';

const About = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>About the Cleaning App</h1>
      
      <section>
        <h2>Welcome to the Cleaning App</h2>
        <p>
          The Cleaning App is designed to help our staff efficiently manage and track cleaning tasks at
          the property. Whether you're cleaning rooms, common areas, or handling maintenance requests,
          the app serves as a reliable tool to stay organized and ensure that all duties are completed
          efficiently and on time.
        </p>
      </section>

      <section>
        <h2>Our Mission</h2>
        <p>
          Our mission is to maintain a clean, safe, and welcoming environment for all residents, guests,
          and staff members. The Cleaning App helps us achieve this by streamlining cleaning operations,
          providing easy access to schedules, and maintaining a clear record of all completed tasks.
        </p>
      </section>

      <section>
        <h2>Features of the Cleaning App</h2>
        <ul>
          <li><strong>Task Management:</strong> Easily view, update, and complete your daily cleaning tasks.</li>
          <li><strong>Real-Time Updates:</strong> Receive real-time notifications for any new cleaning assignments or changes to your schedule.</li>
          <li><strong>Property Records:</strong> Access property-specific details and cleaning history to ensure consistency and quality.</li>
          <li><strong>Confidentiality:</strong> Secure and confidential data management for all cleaning tasks and property information.</li>
          <li><strong>Easy Reporting:</strong> Report issues like damaged equipment, maintenance needs, or any concerns directly through the app.</li>
        </ul>
      </section>

      <section>
        <h2>How It Works</h2>
        <p>
          The Cleaning App integrates seamlessly with your daily cleaning operations. Here's how it works:
        </p>
        <ol>
          <li>Log in to the app with your assigned credentials.</li>
          <li>View your cleaning schedule and tasks for the day.</li>
          <li>Track your progress as you complete tasks and mark them as finished.</li>
          <li>Report any issues (maintenance needs, damages, etc.) directly through the app.</li>
          <li>Maintain a record of completed tasks for accountability and future reference.</li>
        </ol>
      </section>

      <section>
        <h2>Why Choose Our Cleaning App?</h2>
        <p>
          The Cleaning App is designed with you in mind. By using the app, staff can save time, stay organized,
          and reduce confusion or miscommunication regarding their cleaning assignments. It also helps ensure
          that every task is completed with the highest standards of quality, giving everyone peace of mind.
        </p>
      </section>

      <section>
        <h2>Get in Touch</h2>
        <p>
          If you have any questions or need support, feel free to reach out to our support team at:
        </p>
        <p><strong>Email:</strong> support@cleaningapp.com</p>
        <p><strong>Phone:</strong> 1-800-123-4567</p>
      </section>

      <footer style={{ textAlign: 'center', marginTop: '30px' }}>
        <p>Thank you for using the Cleaning App. We look forward to helping you maintain a clean and welcoming environment.</p>
      </footer>
    </div>
  );
};

export default About;
