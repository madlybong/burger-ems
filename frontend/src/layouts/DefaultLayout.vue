<template>
  <v-app>
    <v-navigation-drawer permanent app>
      <v-list>
        <v-list-item title="Astrake EMS" subtitle="Phase 1"></v-list-item>
        <v-divider></v-divider>
        <v-list-item to="/" title="Home" prepend-icon="mdi-home"></v-list-item>
        <v-list-item to="/employees" title="Employees" prepend-icon="mdi-account-group"></v-list-item>
        <v-list-item to="/projects" title="Projects (W.O.)" prepend-icon="mdi-briefcase"></v-list-item>
        <v-list-item to="/billing" title="Billing" prepend-icon="mdi-file-document-multiple"></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>
