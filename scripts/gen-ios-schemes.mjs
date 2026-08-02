// Generates one shared Xcode scheme per demo client so the scheme dropdown in
// platform/ios-customer lists demo-salon, demo-pet, … — pick one and hit ▶.
// Single source of truth: ./demo-data.mjs. Re-run after changing the client list.
//
//   node scripts/gen-ios-schemes.mjs
//
// Each demo scheme sets CLIENT_ID/CLIENT_SLUG as Run env vars; the app reads
// them in DEBUG (see ShawcliffeCustomer/SupabaseClient.swift). The main
// "ShawcliffeCustomer" scheme is (re)written with no override → default client.

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { CLIENTS, clientId } from './demo-data.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCHEMES_DIR = join(
  HERE, '..', 'platform', 'ios-customer',
  'ShawcliffeCustomer.xcodeproj', 'xcshareddata', 'xcschemes',
)

// Blueprint id of the ShawcliffeCustomer app target (from project.pbxproj /
// the existing scheme). Stable for the life of the target.
const BLUEPRINT_ID = 'C35CAAB37E8F37B569494FED'

const buildableRef = () => `      <BuildableReference
         BuildableIdentifier = "primary"
         BlueprintIdentifier = "${BLUEPRINT_ID}"
         BuildableName = "ShawcliffeCustomer.app"
         BlueprintName = "ShawcliffeCustomer"
         ReferencedContainer = "container:ShawcliffeCustomer.xcodeproj">
      </BuildableReference>`

// env: { CLIENT_ID, CLIENT_SLUG } or null for the default (no override) scheme.
function scheme(env) {
  const envBlock = env
    ? `      <EnvironmentVariables>
         <EnvironmentVariable key = "CLIENT_ID" value = "${env.CLIENT_ID}" isEnabled = "YES"></EnvironmentVariable>
         <EnvironmentVariable key = "CLIENT_SLUG" value = "${env.CLIENT_SLUG}" isEnabled = "YES"></EnvironmentVariable>
      </EnvironmentVariables>
`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "2630"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES"
      buildArchitectures = "Automatic">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
${buildableRef()}
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES"
      shouldAutocreateTestPlan = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
${buildableRef()}
      </BuildableProductRunnable>
${envBlock}   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
${buildableRef()}
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`
}

mkdirSync(SCHEMES_DIR, { recursive: true })

// Main scheme → default client (no env override).
writeFileSync(join(SCHEMES_DIR, 'ShawcliffeCustomer.xcscheme'), scheme(null))

// One scheme per demo, named by slug so the dropdown reads "demo-salon" etc.
for (const c of CLIENTS) {
  writeFileSync(
    join(SCHEMES_DIR, `${c.slug}.xcscheme`),
    scheme({ CLIENT_ID: clientId(c.n), CLIENT_SLUG: c.slug }),
  )
}

console.log(`Wrote ${CLIENTS.length} demo schemes + reset main scheme →`)
console.log(`  ${SCHEMES_DIR}`)
for (const c of CLIENTS) console.log(`  • ${c.slug}  (${c.business_name})`)
