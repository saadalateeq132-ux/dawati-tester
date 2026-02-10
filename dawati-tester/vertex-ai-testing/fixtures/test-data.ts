/**
 * Test Data Fixtures for Dawati Testing
 *
 * Provides:
 * - Test user accounts
 * - Test vendor data
 * - Invalid input data for error state testing
 * - Mock data for form filling
 */

export const testUsers = {
  customer: {
    phone: '+966501234567',
    name: 'مستخدم اختبار',
    email: 'test.customer@dawati-test.com',
    otp: '123456',
  },
  vendor: {
    phone: '+966509876543',
    name: 'بائع اختبار',
    email: 'test.vendor@dawati-test.com',
    otp: '123456',
  },
  admin: {
    phone: '+966500000000',
    name: 'مسؤول اختبار',
    email: 'admin@dawati-test.com',
    otp: '123456',
  },
};

export const testVendors = [
  { name: 'قاعة الافراح الذهبية', category: 'venues', price: 5000, city: 'الرياض' },
  { name: 'استديو النور للتصوير', category: 'photography', price: 2000, city: 'جدة' },
  { name: 'كيك الاميرة', category: 'catering', price: 1500, city: 'الدمام' },
];

export const invalidInputs = {
  phone: [
    { value: '123', description: 'Too short' },
    { value: '+1234567890', description: 'Non-Saudi country code' },
    { value: 'abc', description: 'Non-numeric' },
    { value: '', description: 'Empty' },
    { value: '+966', description: 'Country code only' },
    { value: '+9660000000000', description: 'Too long' },
  ],
  email: [
    { value: 'invalid', description: 'No @ symbol' },
    { value: '@no-domain', description: 'No user part' },
    { value: 'spaces @email.com', description: 'Contains spaces' },
    { value: '', description: 'Empty' },
    { value: 'user@', description: 'No domain' },
  ],
  name: [
    { value: '', description: 'Empty' },
    { value: '   ', description: 'Whitespace only' },
    { value: '<script>alert("xss")</script>', description: 'XSS attempt' },
    { value: 'a'.repeat(500), description: 'Very long string' },
    { value: '12345', description: 'Numeric only' },
  ],
  password: [
    { value: '123', description: 'Too short' },
    { value: 'password', description: 'Common password' },
    { value: '', description: 'Empty' },
    { value: 'aaaaaa', description: 'No complexity' },
  ],
  date: [
    { value: '2020-01-01', description: 'Past date for future event' },
    { value: '9999-12-31', description: 'Far future date' },
    { value: 'invalid', description: 'Not a date' },
  ],
};

export const testEvents = {
  wedding: {
    title: 'حفل زفاف اختبار',
    date: '2026-06-15',
    guests: '200',
    budget: '50000',
    city: 'الرياض',
  },
  birthday: {
    title: 'حفل عيد ميلاد',
    date: '2026-04-20',
    guests: '30',
    budget: '5000',
    city: 'جدة',
  },
};

export const saudiPhoneFormats = [
  '+966501234567',  // International format
  '0501234567',     // Local format
  '966501234567',   // No plus
];
