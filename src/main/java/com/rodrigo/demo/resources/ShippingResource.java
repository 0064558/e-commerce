package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.records.ShippingQuoteRequestDTO;
import com.rodrigo.demo.entities.records.ShippingQuoteResponseDTO;
import com.rodrigo.demo.services.MelhorEnvioAuthService;
import com.rodrigo.demo.services.ShippingQuoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/shipping")
public class ShippingResource {

    @Autowired
    private ShippingQuoteService shippingQuoteService;

    @Autowired
    private MelhorEnvioAuthService melhorEnvioAuthService;

    @PostMapping("/quote")
    public ResponseEntity<ShippingQuoteResponseDTO> quote(@RequestBody ShippingQuoteRequestDTO request) {
        return ResponseEntity.ok(shippingQuoteService.quote(request));
    }

    @GetMapping("/oauth/authorize")
    public ResponseEntity<Map<String, String>> authorize(@RequestParam(required = false) String state) {
        String authorizeUrl = melhorEnvioAuthService.buildAuthorizeUrl(state);
        return ResponseEntity.ok(Map.of("authorizeUrl", authorizeUrl));
    }

    @GetMapping(value = "/oauth/callback", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callback(@RequestParam(required = false, name = "code") String code,
                                           @RequestParam(required = false, name = "CODE") String codeUpper,
                                           @RequestParam(required = false) String state) {
        String resolvedCode = hasText(code) ? code : codeUpper;
        return handleCallback(resolvedCode, state);
    }

    @GetMapping(value = "/oauth/callback-alt", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callbackAlt(@RequestParam(required = false, name = "code") String code,
                                              @RequestParam(required = false, name = "CODE") String codeUpper,
                                              @RequestParam(required = false) String state) {
        String resolvedCode = hasText(code) ? code : codeUpper;
        return handleCallback(resolvedCode, state);
    }

    @GetMapping(value = "/", params = {"code"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callbackAtRoot(@RequestParam(name = "code") String code,
                                                 @RequestParam(required = false) String state) {
        return handleCallback(code, state);
    }

    @GetMapping(value = "/", params = {"CODE"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callbackAtRootUpper(@RequestParam(name = "CODE") String code,
                                                      @RequestParam(required = false) String state) {
        return handleCallback(code, state);
    }

    private ResponseEntity<String> handleCallback(String code, String state) {
        try {
            melhorEnvioAuthService.authorizeWithCode(code);
            String html = """
                    <html><body style='font-family:Arial,sans-serif;padding:20px'>
                    <h2>Melhor Envio conectado com sucesso</h2>
                    <p>Voce ja pode fechar esta aba e voltar para a loja.</p>
                    <p>State: %s</p>
                    </body></html>
                    """.formatted(state == null ? "(nao informado)" : state);
            return ResponseEntity.ok(html);
        } catch (Exception ex) {
            String html = """
                    <html><body style='font-family:Arial,sans-serif;padding:20px'>
                    <h2>Falha ao conectar com Melhor Envio</h2>
                    <p>%s</p>
                    </body></html>
                    """.formatted(ex.getMessage() == null ? "Erro desconhecido" : ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(html);
        }
    }

    @GetMapping("/oauth/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(melhorEnvioAuthService.getStatus());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
