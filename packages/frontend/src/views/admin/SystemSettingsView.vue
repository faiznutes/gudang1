<script setup lang="ts">
import { ref } from 'vue'
import {
  Settings,
  Mail,
  Key,
  Shield,
  Database,
  Bell,
  Save,
  RefreshCw,
  Server,
  Zap,
  AlertTriangle,
  CheckCircle,
} from 'lucide-vue-next'

const activeSection = ref('general')

const sections = [
  { id: 'general', name: 'General', icon: Settings },
  { id: 'api', name: 'API & Keys', icon: Key },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'database', name: 'Database', icon: Database },
  { id: 'notifications', name: 'Notifications', icon: Bell },
]

const generalSettings = ref({
  siteName: 'StockPilot',
  siteUrl: 'https://stockpilot.id',
  timezone: 'Asia/Jakarta',
  language: 'id',
  currency: 'IDR',
  dateFormat: 'DD/MM/YYYY',
})

const apiSettings = ref({
  apiEnabled: true,
  apiRateLimit: '1000',
  apiKey: 'sk_live_xxxxxxxxxxxxxxxxxxxx',
  showApiKey: false,
  webhookUrl: 'https://api.stockpilot.id/webhook',
  webhookEnabled: true,
})

const emailSettings = ref({
  smtpHost: 'smtp.mailtrap.io',
  smtpPort: '587',
  smtpUser: 'smtp@stockpilot.id',
  smtpPassword: '********',
  smtpFrom: 'noreply@stockpilot.id',
  emailEnabled: true,
})

const securitySettings = ref({
  twoFactorRequired: false,
  sessionTimeout: '30',
  passwordMinLength: '8',
  maxLoginAttempts: '5',
  ipWhitelistEnabled: false,
})

const databaseSettings = ref({
  dbHost: 'localhost',
  dbPort: '5432',
  dbName: 'stockpilot_prod',
  dbUser: 'stockpilot',
  backupEnabled: true,
  backupFrequency: 'daily',
})

const notificationSettings = ref({
  emailNotifications: true,
  slackNotifications: false,
  slackWebhook: '',
  criticalAlerts: true,
  weeklyReports: true,
})

const systemStatus = ref([
  { service: 'API Server', status: 'healthy', uptime: '99.9%', lastCheck: '2 min ago' },
  { service: 'Database', status: 'healthy', uptime: '99.8%', lastCheck: '2 min ago' },
  { service: 'Cache Server', status: 'healthy', uptime: '99.5%', lastCheck: '2 min ago' },
  { service: 'Queue Worker', status: 'warning', uptime: '98.2%', lastCheck: '5 min ago' },
  { service: 'CDN', status: 'healthy', uptime: '100%', lastCheck: '1 min ago' },
])

const saving = ref(false)
const saveMessage = ref('')

function saveSettings() {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    saveMessage.value = 'Settings saved successfully!'
    setTimeout(() => { saveMessage.value = '' }, 3000)
  }, 1000)
}

function toggleApiKey() {
  apiSettings.value.showApiKey = !apiSettings.value.showApiKey
}
</script>

<template>
  <div class="p-4 lg:p-8 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">System Settings</h2>
        <p class="text-neutral-600">Konfigurasi sistem StockPilot</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="saveMessage" class="text-sm text-success-600 flex items-center gap-2">
          <CheckCircle class="w-4 h-4" />
          {{ saveMessage }}
        </span>
        <button @click="saveSettings" class="btn-primary" :disabled="saving">
          <RefreshCw v-if="saving" class="w-4 h-4 animate-spin" />
          <Save v-else class="w-4 h-4" />
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>

    <div class="grid lg:grid-cols-4 gap-6">
      <!-- Sidebar Navigation -->
      <div class="lg:col-span-1">
        <div class="card p-2">
          <nav class="space-y-1">
            <button
              v-for="section in sections"
              :key="section.id"
              @click="activeSection = section.id"
              :class="[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                activeSection === section.id
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              ]"
            >
              <component :is="section.icon" class="w-5 h-5" />
              {{ section.name }}
            </button>
          </nav>
        </div>
      </div>

      <!-- Content -->
      <div class="lg:col-span-3 space-y-6">
        <!-- General Settings -->
        <div v-if="activeSection === 'general'" class="card">
          <div class="p-4 border-b border-neutral-100">
            <h3 class="font-semibold text-neutral-900">General Settings</h3>
          </div>
          <div class="p-4 space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="label">Site Name</label>
                <input v-model="generalSettings.siteName" type="text" class="input w-full" />
              </div>
              <div>
                <label class="label">Site URL</label>
                <input v-model="generalSettings.siteUrl" type="url" class="input w-full" />
              </div>
              <div>
                <label class="label">Timezone</label>
                <select v-model="generalSettings.timezone" class="input w-full">
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </select>
              </div>
              <div>
                <label class="label">Language</label>
                <select v-model="generalSettings.language" class="input w-full">
                  <option value="id">Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label class="label">Currency</label>
                <select v-model="generalSettings.currency" class="input w-full">
                  <option value="IDR">IDR (Indonesian Rupiah)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
              <div>
                <label class="label">Date Format</label>
                <select v-model="generalSettings.dateFormat" class="input w-full">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- API & Keys -->
        <div v-if="activeSection === 'api'" class="card">
          <div class="p-4 border-b border-neutral-100">
            <h3 class="font-semibold text-neutral-900">API & Keys</h3>
          </div>
          <div class="p-4 space-y-4">
            <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3">
                <Zap class="w-5 h-5 text-neutral-500" />
                <div>
                  <p class="text-sm font-medium text-neutral-900">API Access</p>
                  <p class="text-xs text-neutral-500">Enable API access for external integrations</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="apiSettings.apiEnabled" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div>
              <label class="label">API Key</label>
              <div class="relative">
                <input
                  v-model="apiSettings.apiKey"
                  :type="apiSettings.showApiKey ? 'text' : 'password'"
                  class="input w-full pr-10"
                  readonly
                />
                <button @click="toggleApiKey" class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  <Eye v-if="!apiSettings.showApiKey" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label class="label">Rate Limit (req/hour)</label>
              <select v-model="apiSettings.apiRateLimit" class="input w-full">
                <option value="100">100</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
                <option value="5000">5000</option>
              </select>
            </div>

            <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3">
                <Zap class="w-5 h-5 text-neutral-500" />
                <div>
                  <p class="text-sm font-medium text-neutral-900">Webhook</p>
                  <p class="text-xs text-neutral-500">Send events to your webhook URL</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="apiSettings.webhookEnabled" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div>
              <label class="label">Webhook URL</label>
              <input v-model="apiSettings.webhookUrl" type="url" class="input w-full" />
            </div>
          </div>
        </div>

        <!-- Email Settings -->
        <div v-if="activeSection === 'email'" class="card">
          <div class="p-4 border-b border-neutral-100">
            <h3 class="font-semibold text-neutral-900">Email Settings</h3>
          </div>
          <div class="p-4 space-y-4">
            <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3">
                <Mail class="w-5 h-5 text-neutral-500" />
                <div>
                  <p class="text-sm font-medium text-neutral-900">Email Notifications</p>
                  <p class="text-xs text-neutral-500">Enable email sending</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="emailSettings.emailEnabled" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="label">SMTP Host</label>
                <input v-model="emailSettings.smtpHost" type="text" class="input w-full" />
              </div>
              <div>
                <label class="label">SMTP Port</label>
                <input v-model="emailSettings.smtpPort" type="text" class="input w-full" />
              </div>
              <div>
                <label class="label">SMTP Username</label>
                <input v-model="emailSettings.smtpUser" type="text" class="input w-full" />
              </div>
              <div>
                <label class="label">SMTP Password</label>
                <input v-model="emailSettings.smtpPassword" type="password" class="input w-full" />
              </div>
            </div>

            <div>
              <label class="label">From Email</label>
              <input v-model="emailSettings.smtpFrom" type="email" class="input w-full" />
            </div>
          </div>
        </div>

        <!-- Security Settings -->
        <div v-if="activeSection === 'security'" class="card">
          <div class="p-4 border-b border-neutral-100">
            <h3 class="font-semibold text-neutral-900">Security Settings</h3>
          </div>
          <div class="p-4 space-y-4">
            <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3">
                <Shield class="w-5 h-5 text-neutral-500" />
                <div>
                  <p class="text-sm font-medium text-neutral-900">Two-Factor Authentication</p>
                  <p class="text-xs text-neutral-500">Require 2FA for all admin accounts</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="securitySettings.twoFactorRequired" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="label">Session Timeout (minutes)</label>
                <input v-model="securitySettings.sessionTimeout" type="number" class="input w-full" />
              </div>
              <div>
                <label class="label">Min Password Length</label>
                <input v-model="securitySettings.passwordMinLength" type="number" class="input w-full" />
              </div>
              <div>
                <label class="label">Max Login Attempts</label>
                <input v-model="securitySettings.maxLoginAttempts" type="number" class="input w-full" />
              </div>
            </div>
          </div>
        </div>

        <!-- Database Settings -->
        <div v-if="activeSection === 'database'" class="card">
          <div class="p-4 border-b border-neutral-100">
            <h3 class="font-semibold text-neutral-900">Database Settings</h3>
          </div>
          <div class="p-4 space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="label">Database Host</label>
                <input v-model="databaseSettings.dbHost" type="text" class="input w-full" />
              </div>
              <div>
                <label class="label">Database Port</label>
                <input v-model="databaseSettings.dbPort" type="text" class="input w-full" />
              </div>
              <div>
                <label class="label">Database Name</label>
                <input v-model="databaseSettings.dbName" type="text" class="input w-full" />
              </div>
              <div>
                <label class="label">Database User</label>
                <input v-model="databaseSettings.dbUser" type="text" class="input w-full" />
              </div>
            </div>

            <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3">
                <Database class="w-5 h-5 text-neutral-500" />
                <div>
                  <p class="text-sm font-medium text-neutral-900">Auto Backup</p>
                  <p class="text-xs text-neutral-500">Automatically backup database</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="databaseSettings.backupEnabled" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div>
              <label class="label">Backup Frequency</label>
              <select v-model="databaseSettings.backupFrequency" class="input w-full">
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div v-if="activeSection === 'notifications'" class="card">
          <div class="p-4 border-b border-neutral-100">
            <h3 class="font-semibold text-neutral-900">Notification Settings</h3>
          </div>
          <div class="p-4 space-y-4">
            <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3">
                <Mail class="w-5 h-5 text-neutral-500" />
                <div>
                  <p class="text-sm font-medium text-neutral-900">Email Notifications</p>
                  <p class="text-xs text-neutral-500">Receive notifications via email</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="notificationSettings.emailNotifications" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3">
                <AlertTriangle class="w-5 h-5 text-neutral-500" />
                <div>
                  <p class="text-sm font-medium text-neutral-900">Critical Alerts</p>
                  <p class="text-xs text-neutral-500">Get notified for critical system issues</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="notificationSettings.criticalAlerts" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3">
                <Server class="w-5 h-5 text-neutral-500" />
                <div>
                  <p class="text-sm font-medium text-neutral-900">Weekly Reports</p>
                  <p class="text-xs text-neutral-500">Receive weekly system reports</p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="notificationSettings.weeklyReports" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- System Status -->
        <div class="card">
          <div class="p-4 border-b border-neutral-100">
            <h3 class="font-semibold text-neutral-900">System Status</h3>
          </div>
          <div class="p-4 space-y-3">
            <div v-for="service in systemStatus" :key="service.service" class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div class="flex items-center gap-3">
                <Server class="w-5 h-5 text-neutral-500" />
                <span class="text-sm font-medium text-neutral-900">{{ service.service }}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-xs text-neutral-500">Uptime: {{ service.uptime }}</span>
                <span class="text-xs text-neutral-500">Last: {{ service.lastCheck }}</span>
                <span :class="['px-2 py-1 rounded-full text-xs font-medium', service.status === 'healthy' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700']">
                  {{ service.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>