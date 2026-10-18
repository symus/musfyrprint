package com.musfyr.print.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI printOpenApi(AppProperties props) {
        return new OpenAPI()
                .info(new Info()
                        .title(props.brand().name() + " API")
                        .version("v1")
                        .description("Versioned REST API for the custom apparel & sticker platform. "
                                + "Browser clients authenticate with an HttpOnly session cookie and must send the "
                                + "X-XSRF-TOKEN header on state-changing requests; API clients may use a Bearer token."))
                .components(new Components()
                        .addSecuritySchemes("cookieAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("mp_at"))
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")));
    }
}
